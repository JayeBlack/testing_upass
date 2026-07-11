const db = require("../db");
const { uploadToCloudinary, useCloudinary } = require("../middleware/upload");

// GET /api/thesis/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    // IDOR: Students can only view their own thesis
    if (req.user.role === "Student") {
      const own = await db.query("SELECT id FROM students WHERE user_id = $1", [req.user.id]);
      if (own.rows.length === 0 || String(own.rows[0].id) !== String(req.params.studentId)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const result = await db.query(
      "SELECT * FROM thesis_submissions WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 1",
      [req.params.studentId]
    );
    if (result.rows.length === 0) {
      return res.json({ status: "Not Started" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/thesis/my-submissions (authenticated student)
exports.getMySubmissions = async (req, res) => {
  try {
    const studentResult = await db.query(
      "SELECT id FROM students WHERE user_id = $1",
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.json([]);
    }
    const studentId = studentResult.rows[0].id;
    const result = await db.query(
      "SELECT id, stage, file_name, status, feedback, submitted_at FROM thesis_submissions WHERE student_id = $1 ORDER BY submitted_at DESC",
      [studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/thesis/pending (for supervisors - returns all submissions, not just pending)
exports.getPending = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ts.*, u.first_name, u.last_name, s.index_number
       FROM thesis_submissions ts
       JOIN students s ON ts.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ORDER BY ts.submitted_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/thesis/upload
exports.upload = async (req, res) => {
  try {
    const { stage } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!stage) return res.status(400).json({ error: "Stage is required" });

    const studentResult = await db.query(
      "SELECT id FROM students WHERE user_id = $1",
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student record not found" });
    }
    const student_id = studentResult.rows[0].id;

    let file_url, file_name;
    file_name = req.file.originalname;
    if (useCloudinary) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, "upass/thesis");
      file_url = result.secure_url;
    } else {
      file_url = `/uploads/thesis/${req.file.filename}`;
    }

    const result = await db.query(
      `INSERT INTO thesis_submissions (student_id, stage, file_url, file_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, stage, file_name, status, feedback, submitted_at`,
      [student_id, stage, file_url, file_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/thesis/:id/review
exports.review = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Approved", "Rejected", "Under Review"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status value" });
    const result = await db.query(
      `UPDATE thesis_submissions SET status = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3 RETURNING *`,
      [status, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Submission not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/thesis/:id/remarks
exports.addRemark = async (req, res) => {
  try {
    const { remark_text } = req.body;
    const result = await db.query(
      `INSERT INTO thesis_remarks (submission_id, author_id, remark_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, req.user.id, remark_text]
    );
    // Also update the feedback column on thesis_submissions so students can see it
    await db.query(
      `UPDATE thesis_submissions SET feedback = $1 WHERE id = $2`,
      [remark_text, req.params.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/thesis/:id/remarks
exports.getRemarks = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT tr.*, u.first_name, u.last_name
       FROM thesis_remarks tr
       JOIN users u ON tr.author_id = u.id
       WHERE tr.submission_id = $1
       ORDER BY tr.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
