const db = require("../db");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

// Helper function to generate program code from name
function generateProgramCode(name) {
  // Convert to uppercase, remove special chars, keep only alphanumeric
  let code = name.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
  // Take first letters of each word or first 10 chars
  if (code.includes(" ")) {
    code = code.split(" ").map(w => w[0]).join("").substring(0, 10);
  } else {
    code = code.substring(0, 10);
  }
  return code || "PROG";
}

// GET /api/students/me - Get current user's student profile
exports.getMyProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
              p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/students
exports.getAll = async (req, res) => {
  try {
    const { department, status, search } = req.query;
    let sql = `
      SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
             p.name AS program_name, d.name AS department_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (department) { sql += ` AND d.name = $${idx++}`; params.push(department); }
    if (status) { sql += ` AND s.status = $${idx++}`; params.push(status); }
    if (search) {
      sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR s.index_number ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    sql += " ORDER BY u.last_name";

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/students/:id
exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
              p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/students (enroll)
exports.create = async (req, res) => {
  try {
    const {
      user_id, index_number, program_id, department_id,
      admission_year, study_mode, admission_cycle,
    } = req.body;
    if (!user_id || !index_number || !program_id || !department_id || !admission_year) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO students (user_id, index_number, program_id, department_id, admission_year, study_mode, admission_cycle)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, index_number, program_id, department_id, admission_year, study_mode || "Full-time", admission_cycle || "January"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Student already exists" });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/students/enroll
// Accepts: { name, email, index, program, department, admission_year, admission_cycle }
// Creates a user (role=Student) and student record; creates program/department if missing
exports.enroll = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, email, index, program, department, admission_year, admission_cycle } = req.body;
    if (!name || !email || !index) return res.status(400).json({ error: "Missing required fields" });

    const [first_name, ...rest] = name.trim().split(/\s+/);
    const last_name = rest.join(" ") || "";
    const defaultPwd = String(index).trim();

    await client.query("BEGIN");

    // ensure email not registered
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPwd, salt);

    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password)
       VALUES ($1, $2, 'Student', $3, $4, TRUE)
       RETURNING id, email`,
      [email, hash, first_name, last_name]
    );
    const userId = userInsert.rows[0].id;

    // find or create program
    let programId = null;
    if (program) {
      const p = await client.query("SELECT id FROM programs WHERE LOWER(name) = LOWER($1)", [program]);
      if (p.rows.length > 0) programId = p.rows[0].id;
      else {
        const programCode = generateProgramCode(program);
        const np = await client.query("INSERT INTO programs (name, code, is_active) VALUES ($1, $2, TRUE) RETURNING id", [program, programCode]);
        programId = np.rows[0].id;
      }
    }

    // find or create department
    let deptId = null;
    if (department) {
      const d = await client.query("SELECT id FROM departments WHERE LOWER(name) = LOWER($1)", [department]);
      if (d.rows.length > 0) deptId = d.rows[0].id;
      else {
        const nd = await client.query("INSERT INTO departments (name, is_active) VALUES ($1, TRUE) RETURNING id", [department]);
        deptId = nd.rows[0].id;
      }
    }

    const admYear = admission_year || new Date().getFullYear();
    const admCycle = admission_cycle || "January";

    const stud = await client.query(
      `INSERT INTO students (user_id, index_number, program_id, department_id, admission_year, admission_cycle)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, index, programId, deptId, admYear, admCycle]
    );

    // fetch full student record with joined names
    const out = await client.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [stud.rows[0].id]
    );

    await client.query("COMMIT");
    res.status(201).json({ student: out.rows[0], default_password: defaultPwd });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    if (err.code === "23505") return res.status(409).json({ error: "Student already exists" });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/students/:id
exports.update = async (req, res) => {
  try {
    const { status, study_mode } = req.body;
    const result = await db.query(
      `UPDATE students SET status = COALESCE($1, status), study_mode = COALESCE($2, study_mode), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, study_mode, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/students/:id (hard delete)
exports.remove = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    
    // Get student's user_id before deletion
    const studentQuery = await client.query(
      "SELECT user_id FROM students WHERE id = $1",
      [req.params.id]
    );
    
    if (studentQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Student not found" });
    }
    
    const userId = studentQuery.rows[0].user_id;
    
    // Delete student record first (due to foreign key)
    await client.query("DELETE FROM students WHERE id = $1", [req.params.id]);
    
    // Delete associated user account
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    
    await client.query("COMMIT");
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// POST /api/students/parse-bulk
// Accepts multipart file (CSV or XLSX)
// Returns parsed rows: { rows: [{ name, index, email, program, department }, ...] }
exports.parseBulk = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { mimetype, buffer } = req.file;
    const isExcel = /\.(xlsx?|xls)$|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/i.test(
      mimetype || req.file.originalname
    );

    let rows = [];
    if (isExcel) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    } else {
      const text = buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      rows = lines.map((line) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else current += ch;
        }
        result.push(current.trim());
        return result;
      });
    }

    if (rows.length < 2) return res.status(400).json({ error: "File must contain header and at least one row" });

    // map columns
    const headers = rows[0];
    const normalized = headers.map((h) => String(h).toLowerCase().replace(/[^a-z]/g, ""));
    const colMap = {};
    const knownCols = {
      name: ["name", "fullname", "studentname", "student"],
      index: ["index", "indexnumber", "indexno", "studentid", "regno", "regnumber"],
      email: ["email", "emailaddress", "mail"],
      program: ["program", "programme", "course", "programname", "programmename"],
      department: ["department", "dept", "departmentname"],
      cohort: ["cohort", "admissioncycle", "cycle", "intake"],
    };
    for (const [field, aliases] of Object.entries(knownCols)) {
      const idx = normalized.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }
    if (Object.keys(colMap).length < 2) {
      colMap.name = 0;
      colMap.index = 1;
      colMap.email = 2;
      colMap.program = 3;
      colMap.department = 4;
      colMap.cohort = 5;
    }

    // parse rows
    const parsed = rows.slice(1).map((cols) => {
      const cohortVal = (cols[colMap.cohort ?? 5] || "").toString().trim().toLowerCase();
      let cohort = "January"; // default
      if (cohortVal.includes("july") || cohortVal.includes("jul") || cohortVal === "2") {
        cohort = "July";
      }
      return {
        name: (cols[colMap.name ?? 0] || "").toString().trim(),
        index: (cols[colMap.index ?? 1] || "").toString().trim(),
        email: (cols[colMap.email ?? 2] || "").toString().trim(),
        program: (cols[colMap.program ?? 3] || "").toString().trim(),
        department: (cols[colMap.department ?? 4] || "").toString().trim(),
        admission_cycle: cohort,
      };
    }).filter((s) => s.name && s.index);

    if (parsed.length === 0) {
      return res.status(400).json({ error: "No valid student records found" });
    }

    res.json({ rows: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/students/enroll-bulk
// Accepts: { students: [{ name, email, index, program, department, admission_year }, ...] }
// Enrolls multiple students at once
exports.enrollBulk = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "No students to enroll" });
    }

    const enrolled = [];
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const { name, email, index, program, department, admission_year, admission_cycle } = students[i];
      if (!name || !email || !index) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      const client = await db.pool.connect();
      try {
        const [first_name, ...rest] = name.trim().split(/\s+/);
        const last_name = rest.join(" ") || "";
        const defaultPwd = String(index).trim();

        await client.query("BEGIN");

        // check email exists
        const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
          await client.query("ROLLBACK");
          errors.push(`Row ${i + 1}: Email already registered`);
          continue;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(defaultPwd, salt);

        const userInsert = await client.query(
          `INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password)
           VALUES ($1, $2, 'Student', $3, $4, TRUE)
           RETURNING id, email`,
          [email, hash, first_name, last_name]
        );
        const userId = userInsert.rows[0].id;

        // find or create program
        let programId = null;
        if (program) {
          const p = await client.query("SELECT id FROM programs WHERE LOWER(name) = LOWER($1)", [program]);
          if (p.rows.length > 0) programId = p.rows[0].id;
          else {
            const programCode = generateProgramCode(program);
            const np = await client.query("INSERT INTO programs (name, code, is_active) VALUES ($1, $2, TRUE) RETURNING id", [program, programCode]);
            programId = np.rows[0].id;
          }
        }

        // find or create department
        let deptId = null;
        if (department) {
          const d = await client.query("SELECT id FROM departments WHERE LOWER(name) = LOWER($1)", [department]);
          if (d.rows.length > 0) deptId = d.rows[0].id;
          else {
            const nd = await client.query("INSERT INTO departments (name, is_active) VALUES ($1, TRUE) RETURNING id", [department]);
            deptId = nd.rows[0].id;
          }
        }

        const admYear = admission_year || new Date().getFullYear();
        const admCycle = admission_cycle || "January";

        const stud = await client.query(
          `INSERT INTO students (user_id, index_number, program_id, department_id, admission_year, admission_cycle)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [userId, index, programId, deptId, admYear, admCycle]
        );

        // fetch full student record
        const out = await client.query(
          `SELECT s.*, u.first_name, u.last_name, u.email, p.name AS program_name, d.name AS department_name
           FROM students s
           JOIN users u ON s.user_id = u.id
           LEFT JOIN programs p ON s.program_id = p.id
           LEFT JOIN departments d ON s.department_id = d.id
           WHERE s.id = $1`,
          [stud.rows[0].id]
        );

        await client.query("COMMIT");
        enrolled.push(out.rows[0]);
      } catch (err) {
        try { await client.query("ROLLBACK"); } catch {}
        if (err.code === "23505") {
          errors.push(`Row ${i + 1}: Student already exists`);
        } else {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      } finally {
        client.release();
      }
    }

    res.status(201).json({ enrolled, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
