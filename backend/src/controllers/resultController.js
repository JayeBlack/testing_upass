const db = require("../db");
const { createNotification } = require("./notificationController");
const xlsx = require("xlsx");

// GET /api/results/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    const userId = req.params.studentId;

    // IDOR: Students can only view their own results
    if (req.user.role === "Student" && String(userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const studentRes = await db.query(
      `SELECT id FROM students WHERE user_id = $1`,
      [userId]
    );
    
    if (studentRes.rows.length === 0) {
      return res.json([]); // No student record found, return empty array
    }
    
    const studentId = studentRes.rows[0].id;
    
    // Now fetch grades for this student
    const result = await db.query(
      `SELECT g.*, c.code, c.name AS course_name, c.credits
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = $1
       ORDER BY g.academic_year, g.semester, c.code`,
      [studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/results/grades/by-index (batch grade entry by index number — used by GradeEntry UI)
exports.enterGradesByIndex = async (req, res) => {
  try {
    const { grades, semester, academic_year } = req.body;

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: "Grades array required" });
    }

    // Convert semester string to number ("Semester 1" -> 1)
    const semesterNum = typeof semester === 'string' ? parseInt(semester.replace(/\D/g, '')) || 1 : semester;

    const results = [];
    const errors = [];

    for (const g of grades) {
      try {
        // resolve student by index number
        const studentRes = await db.query(
          "SELECT id FROM students WHERE index_number = $1",
          [g.student_index]
        );
        if (studentRes.rows.length === 0) {
          errors.push(`Student not found: ${g.student_index}`);
          continue;
        }
        const student_id = studentRes.rows[0].id;

        // find or create course by name
        let courseRes = await db.query(
          "SELECT id FROM courses WHERE LOWER(name) = LOWER($1)",
          [g.course_name]
        );
        let course_id;
        if (courseRes.rows.length > 0) {
          course_id = courseRes.rows[0].id;
        } else {
          const newCourse = await db.query(
            "INSERT INTO courses (name, code, credits) VALUES ($1, $2, $3) RETURNING id",
            [g.course_name, g.course_name.substring(0, 10).toUpperCase().replace(/\s+/g, ""), g.credits || 3]
          );
          course_id = newCourse.rows[0].id;
        }

        const r = await db.query(
          `INSERT INTO grades (student_id, course_id, grade, marks, semester, academic_year, entered_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, course_id, academic_year) DO UPDATE
           SET grade = $3, marks = $4, entered_by = $7
           RETURNING *`,
          [student_id, course_id, g.grade, g.marks, semesterNum, academic_year, req.user.id]
        );
        results.push(r.rows[0]);
      } catch (err) {
        errors.push(`${g.student_index}: ${err.message}`);
      }
    }

    // create a result batch record
    if (results.length > 0) {
      await db.query(
        `INSERT INTO result_batches (semester, academic_year, status)
         VALUES ($1, $2, 'Draft')`,
        [semester, academic_year]
      );
    }

    res.status(201).json({ message: `${results.length} grades entered`, errors: errors.length ? errors : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/results/batch/:id (delete a result batch)
exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Get batch details
    const batchRes = await db.query(
      `SELECT * FROM result_batches WHERE id = $1`,
      [id]
    );

    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const batch = batchRes.rows[0];

    // Delete all grades associated with this batch (by semester and academic year)
    const deleteGradesRes = await db.query(
      `DELETE FROM grades 
       WHERE academic_year = $1 AND semester = $2
       RETURNING id`,
      [batch.academic_year, batch.semester]
    );

    console.log(`Deleted ${deleteGradesRes.rows.length} grade records`);

    // Delete the batch
    await db.query(
      `DELETE FROM result_batches WHERE id = $1`,
      [id]
    );

    res.json({ 
      message: "Batch and all associated grades deleted successfully",
      gradesDeleted: deleteGradesRes.rows.length
    });
  } catch (err) {
    console.error('Delete batch error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/results/parse-grades-file (parse uploaded Excel/CSV file)
exports.parseGradesFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse directly from buffer (memory storage — no disk path)
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
};

// POST /api/results/batch-upload (publish grades to students)
exports.batchUpload = async (req, res) => {
  try {
    const { grades, semester, academicYear } = req.body;

    console.log('Batch upload request:', { gradesCount: grades?.length, semester, academicYear });

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: "Grades array required" });
    }

    const semesterNum = typeof semester === 'string' ? parseInt(semester.replace(/\D/g, '')) || 1 : semester;
    console.log('Semester parsed as:', semesterNum);

    const results = [];
    const errors = [];

    for (const g of grades) {
      try {
        console.log('Processing grade for:', g.indexNumber);
        
        const studentRes = await db.query(
          "SELECT id, user_id FROM students WHERE index_number = $1",
          [g.indexNumber]
        );
        
        if (studentRes.rows.length === 0) {
          console.warn('Student not found:', g.indexNumber);
          errors.push(`Student not found: ${g.indexNumber}`);
          continue;
        }
        
        const student_id = studentRes.rows[0].id;
        console.log('Found student:', student_id);

        let courseRes = await db.query(
          "SELECT id FROM courses WHERE LOWER(name) = LOWER($1)",
          [g.courseName]
        );
        let course_id;
        if (courseRes.rows.length > 0) {
          course_id = courseRes.rows[0].id;
          console.log('Found existing course:', course_id);
        } else {
          const newCourse = await db.query(
            "INSERT INTO courses (name, code, credits, semester, academic_year) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [g.courseName, g.courseName.substring(0, 10).toUpperCase().replace(/\s+/g, ""), g.credits || 3, semesterNum, academicYear]
          );
          course_id = newCourse.rows[0].id;
          console.log('Created new course:', course_id);
        }

        const r = await db.query(
          `INSERT INTO grades (student_id, course_id, grade, marks, semester, academic_year, entered_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, course_id, academic_year) DO UPDATE
           SET grade = $3, marks = $4, semester = $5, entered_by = $7
           RETURNING *`,
          [student_id, course_id, g.grade, g.marks, semesterNum, academicYear, req.user.id]
        );
        results.push(r.rows[0]);
        console.log('Grade saved:', r.rows[0].id);
      } catch (err) {
        console.error('Error processing grade:', err.message);
        errors.push(`${g.indexNumber}: ${err.message}`);
      }
    }

    console.log('Results:', results.length, 'Errors:', errors.length);

    if (results.length > 0) {
      // Get department and program from first student
      const firstStudentRes = await db.query(
        `SELECT department_id, program_id FROM students WHERE id = $1`,
        [results[0].student_id]
      );
      const { department_id, program_id } = firstStudentRes.rows[0] || {};
      
      const batchRes = await db.query(
        `INSERT INTO result_batches (semester, academic_year, status, published_by, published_at, department_id, program_id, student_count)
         VALUES ($1, $2, 'Published', $3, NOW(), $4, $5, $6)
         RETURNING id`,
        [semesterNum, academicYear, req.user.id, department_id, program_id, [...new Set(results.map(r => r.student_id))].length]
      );

      console.log('Batch created:', batchRes.rows[0].id);

      // Notify students
      const studentIds = [...new Set(results.map(r => r.student_id))];
      console.log('Notifying students:', studentIds);
      
      for (const studentId of studentIds) {
        const studentRes = await db.query(
          "SELECT user_id FROM students WHERE id = $1",
          [studentId]
        );
        if (studentRes.rows.length > 0) {
          await createNotification(
            studentRes.rows[0].user_id,
            'exam',
            'Results Published',
            `Your Semester ${semesterNum} results for ${academicYear} are now available!`,
            'success'
          );
        }
      }

      return res.status(201).json({
        message: `${results.length} grades published successfully`,
        batchId: batchRes.rows[0].id,
        errors: errors.length ? errors : undefined
      });
    } else {
      console.error('No valid grades processed');
      return res.status(400).json({ error: "No valid grades to publish", errors });
    }
  } catch (err) {
    console.error('Batch upload error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/results/grades (batch grade entry)
exports.enterGrades = async (req, res) => {
  try {
    const { grades } = req.body; // Array of { student_id, course_id, grade, marks, semester, academic_year }
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: "Grades array required" });
    }

    const results = [];
    for (const g of grades) {
      const r = await db.query(
        `INSERT INTO grades (student_id, course_id, grade, marks, semester, academic_year, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, course_id, academic_year) DO UPDATE
         SET grade = $3, marks = $4, entered_by = $7
         RETURNING *`,
        [g.student_id, g.course_id, g.grade, g.marks, g.semester, g.academic_year, req.user.id]
      );
      results.push(r.rows[0]);
    }

    res.status(201).json({ message: `${results.length} grades entered`, grades: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/results/cwa-overview (all students with computed CWA — for Dean/ViceDean)
exports.getCWAOverview = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id, u.first_name, u.last_name, s.index_number,
             p.name AS program_name, d.name AS department_name,
             s.department_id, s.admission_year,
             ROUND(SUM(g.marks * c.credits) / NULLIF(SUM(c.credits), 0), 2) AS cwa
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON s.department_id = d.id
      INNER JOIN grades g ON g.student_id = s.id
      INNER JOIN courses c ON g.course_id = c.id
      WHERE g.marks IS NOT NULL AND g.marks > 0 AND c.credits > 0
      GROUP BY s.id, u.first_name, u.last_name, s.index_number,
               p.name, d.name, s.department_id, s.admission_year
      HAVING SUM(c.credits) > 0
      ORDER BY cwa DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/results/cwa/:studentId
exports.getCWA = async (req, res) => {
  try {
    // IDOR: Students can only view their own CWA
    if (req.user.role === "Student" && String(req.params.studentId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const result = await db.query(
      `SELECT SUM(g.marks * c.credits) / SUM(c.credits) AS cwa
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = $1`,
      [req.params.studentId]
    );
    res.json({ cwa: result.rows[0]?.cwa ? parseFloat(result.rows[0].cwa).toFixed(2) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/results/batches
exports.getBatches = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rb.*, d.name AS department_name, p.name AS program_name
       FROM result_batches rb
       LEFT JOIN departments d ON rb.department_id = d.id
       LEFT JOIN programs p ON rb.program_id = p.id
       ORDER BY rb.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/results/batches/:id/grades
exports.getBatchGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const batchRes = await db.query(
      `SELECT semester, academic_year FROM result_batches WHERE id = $1`,
      [id]
    );
    if (batchRes.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }
    const { semester, academic_year } = batchRes.rows[0];
    
    const gradesRes = await db.query(
      `SELECT s.index_number, 
              CONCAT(u.first_name, ' ', u.last_name) as full_name, 
              c.name as course_name, 
              c.credits, 
              g.marks, 
              g.grade
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON g.course_id = c.id
       WHERE g.semester = $1 AND g.academic_year = $2
       ORDER BY s.index_number, c.name`,
      [semester, academic_year]
    );
    
    res.json(gradesRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/results/batches/:id/publish
exports.publishBatch = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE result_batches SET status = 'Published', published_at = NOW(), published_by = $1
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Batch not found" });
    
    const batch = result.rows[0];
    
    // Notify all students in the batch
    const studentsQuery = await db.query(
      `SELECT DISTINCT s.user_id 
       FROM grades g
       JOIN students s ON g.student_id = s.id
       WHERE g.academic_year = $1 AND g.semester = $2`,
      [batch.academic_year, batch.semester]
    );
    
    for (const student of studentsQuery.rows) {
      await createNotification(
        student.user_id,
        'exam',
        'Results Published',
        `Your ${batch.semester} results for ${batch.academic_year} are now available!`,
        'success'
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
