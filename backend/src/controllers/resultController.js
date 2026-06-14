const db = require("../db");
const { createNotification } = require("./notificationController");

// GET /api/results/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    const userId = req.params.studentId;
    
    // First, find the student record using user_id
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

    // Delete all grades associated with this batch
    await db.query(
      `DELETE FROM grades 
       WHERE academic_year = $1 AND semester = $2 AND entered_by = $3`,
      [batch.academic_year, batch.semester, req.user.id]
    );

    // Delete the batch
    await db.query(
      `DELETE FROM result_batches WHERE id = $1`,
      [id]
    );

    res.json({ message: "Batch deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/results/batch-upload (alias for enterGradesByIndex for CSV/Excel uploads)
exports.batchUpload = exports.enterGradesByIndex;

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

// GET /api/results/cwa/:studentId
exports.getCWA = async (req, res) => {
  try {
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
