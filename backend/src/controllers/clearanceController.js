const db = require("../db");
const { createNotification } = require("./notificationController");

// Which roles may approve which clearance step departments
const STEP_OWNERS = {
  "School Fees":          ["Accountant", "AccountingAssistant", "Admin"],
  "Library":              ["Registrar", "AdminAssistant", "Admin"],
  "Department":           ["Registrar", "AdminAssistant", "Admin"],
  "Thesis Submission":    ["Registrar", "AdminAssistant", "Admin"],
  "ICT Directorate":      ["Registrar", "AdminAssistant", "Admin"],
  "Dean of Postgraduate": ["Dean", "ViceDean", "Admin"],
};

// GET /api/clearance/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    // IDOR: Students can only view their own clearance steps
    if (req.user.role === "Student") {
      const own = await db.query("SELECT id FROM students WHERE user_id = $1", [req.user.id]);
      if (own.rows.length === 0 || String(own.rows[0].id) !== String(req.params.studentId)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    const result = await db.query(
      "SELECT * FROM clearance_steps WHERE student_id = $1 ORDER BY step_order",
      [req.params.studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clearance/all-students — grouped student clearance summary for approvals page
exports.getAllStudents = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        s.id AS student_id,
        s.index_number,
        u.first_name,
        u.last_name,
        p.name AS program_name,
        d.name AS department_name,
        json_agg(
          json_build_object(
            'id',         cs.id,
            'department', cs.department,
            'description',cs.description,
            'status',     cs.status,
            'cleared_by', cs.cleared_by,
            'cleared_at', cs.cleared_at,
            'note',       cs.note,
            'step_order', cs.step_order
          ) ORDER BY cs.step_order
        ) AS steps
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN clearance_steps cs ON cs.student_id = s.id
      WHERE s.status = 'Active'
      GROUP BY s.id, s.index_number, u.first_name, u.last_name, p.name, d.name
      ORDER BY u.last_name, u.first_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clearance/pending (legacy — kept for backward compat)
exports.getPending = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT cs.*, s.index_number, u.first_name, u.last_name, p.name AS program_name, d.name AS department_name
      FROM clearance_steps cs
      JOIN students s ON cs.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE cs.status IN ('pending', 'not_started')
      ORDER BY cs.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clearance/:id/approve
exports.approve = async (req, res) => {
  try {
    const stepRes = await db.query("SELECT * FROM clearance_steps WHERE id = $1", [req.params.id]);
    if (stepRes.rows.length === 0) return res.status(404).json({ error: "Step not found" });
    const step = stepRes.rows[0];

    // Enforce Dean is last — block if any non-Dean step is still uncleared
    if (step.department === "Dean of Postgraduate") {
      const othersRes = await db.query(
        `SELECT id FROM clearance_steps WHERE student_id = $1 AND department != 'Dean of Postgraduate' AND status != 'cleared'`,
        [step.student_id]
      );
      if (othersRes.rows.length > 0) {
        return res.status(400).json({ error: "All other clearance steps must be approved before the Dean can give final approval." });
      }
    }

    const result = await db.query(
      `UPDATE clearance_steps SET status = 'cleared', cleared_by = $1, cleared_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.email, req.params.id]
    );

    const studentQuery = await db.query("SELECT user_id FROM students WHERE id = $1", [step.student_id]);
    if (studentQuery.rows.length > 0) {
      await createNotification(
        studentQuery.rows[0].user_id, "clearance",
        "Clearance Step Approved",
        `Your ${step.department} clearance has been approved!`,
        "success"
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clearance/:id/reject
exports.reject = async (req, res) => {
  try {
    const stepRes = await db.query("SELECT * FROM clearance_steps WHERE id = $1", [req.params.id]);
    if (stepRes.rows.length === 0) return res.status(404).json({ error: "Step not found" });
    const step = stepRes.rows[0];

    const reason = req.body.reason || req.body.note || `Rejected by ${req.user.email}`;
    const result = await db.query(
      `UPDATE clearance_steps SET status = 'not_started', note = $1
       WHERE id = $2 RETURNING *`,
      [reason, req.params.id]
    );

    const studentQuery = await db.query("SELECT user_id FROM students WHERE id = $1", [step.student_id]);
    if (studentQuery.rows.length > 0) {
      await createNotification(
        studentQuery.rows[0].user_id, "clearance",
        "Clearance Requires Attention",
        `Your ${step.department} clearance needs attention: ${reason}`,
        "warning"
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clearance/bulk-approve — approve multiple steps at once
exports.bulkApprove = async (req, res) => {
  try {
    const { step_ids, cleared_by } = req.body;
    if (!Array.isArray(step_ids) || step_ids.length === 0) {
      return res.status(400).json({ error: "step_ids array required" });
    }

    const approved = [];
    const errors = [];

    for (const id of step_ids) {
      try {
        const stepRes = await db.query("SELECT * FROM clearance_steps WHERE id = $1", [id]);
        if (stepRes.rows.length === 0) { errors.push(`Step ${id} not found`); continue; }
        const step = stepRes.rows[0];

        if (step.department === "Dean of Postgraduate") {
          const othersRes = await db.query(
            `SELECT id FROM clearance_steps WHERE student_id = $1 AND department != 'Dean of Postgraduate' AND status != 'cleared'`,
            [step.student_id]
          );
          if (othersRes.rows.length > 0) {
            errors.push(`Cannot approve Dean step for student ${step.student_id} — other steps pending`);
            continue;
          }
        }

        await db.query(
          `UPDATE clearance_steps SET status = 'cleared', cleared_by = $1, cleared_at = NOW() WHERE id = $2`,
          [req.user.email, id]
        );

        const studentQuery = await db.query("SELECT user_id FROM students WHERE id = $1", [step.student_id]);
        if (studentQuery.rows.length > 0) {
          await createNotification(
            studentQuery.rows[0].user_id, "clearance",
            "Clearance Step Approved",
            `Your ${step.department} clearance has been approved!`,
            "success"
          );
        }
        approved.push(id);
      } catch (e) {
        errors.push(`Step ${id}: ${e.message}`);
      }
    }

    res.json({ approved: approved.length, errors: errors.length ? errors : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clearance/supervisor/pending — thesis steps pending for this supervisor
exports.getSupervisorPending = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (cs.id)
         cs.id, cs.status, cs.note, cs.cleared_at,
         s.id AS student_id, s.index_number,
         u.first_name, u.last_name,
         p.name AS program_name
       FROM clearance_steps cs
       JOIN students s ON cs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN student_supervisors ss ON ss.student_id = s.id AND ss.is_primary = true
       LEFT JOIN supervisors sv ON sv.id = ss.supervisor_id
       WHERE cs.department = 'Thesis Submission'
         AND cs.status = 'pending'
         AND (
           cs.supervisor_user_id = $1
           OR sv.user_id = $1
         )
       ORDER BY cs.id, u.last_name, u.first_name`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clearance/apply/:studentId — student applies, sets all not_started steps to pending
exports.applyForClearance = async (req, res) => {
  try {
    const { studentId } = req.params;

    // IDOR: Students can only apply for their own clearance
    if (req.user.role === "Student") {
      const own = await db.query("SELECT id FROM students WHERE user_id = $1", [req.user.id]);
      if (own.rows.length === 0 || String(own.rows[0].id) !== String(studentId)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const existing = await db.query("SELECT id FROM clearance_steps WHERE student_id = $1", [studentId]);
    if (existing.rows.length === 0) return res.status(400).json({ error: "Clearance steps not initialised" });

    await db.query(
      `UPDATE clearance_steps SET status = 'pending', note = NULL
       WHERE student_id = $1 AND status = 'not_started'`,
      [studentId]
    );

    // Notify the student
    const studentQuery = await db.query("SELECT user_id FROM students WHERE id = $1", [studentId]);
    if (studentQuery.rows.length > 0) {
      await createNotification(
        studentQuery.rows[0].user_id, "clearance",
        "Clearance Application Submitted",
        "Your clearance application has been submitted. Steps are now pending review.",
        "info"
      );
    }

    // Notify Accountants (School Fees)
    const accountants = await db.query(`SELECT id FROM users WHERE role IN ('Accountant','AccountingAssistant') AND is_active = true`);
    for (const u of accountants.rows) {
      await createNotification(u.id, "clearance", "Clearance Pending", "A student has applied for clearance. Please review the School Fees step.", "info");
    }

    // Notify Registrars / AdminAssistants (Library, Department, ICT)
    const registrars = await db.query(`SELECT id FROM users WHERE role IN ('Registrar','AdminAssistant') AND is_active = true`);
    for (const u of registrars.rows) {
      await createNotification(u.id, "clearance", "Clearance Pending", "A student has applied for clearance. Please review your assigned steps.", "info");
    }

    // Notify the student's assigned supervisor (Thesis Submission)
    const supervisorQuery = await db.query(
      `SELECT u.id FROM student_supervisors ss
       JOIN supervisors sv ON ss.supervisor_id = sv.id
       JOIN users u ON sv.user_id = u.id
       WHERE ss.student_id = $1 AND ss.is_primary = true
       LIMIT 1`,
      [studentId]
    );
    if (supervisorQuery.rows.length > 0) {
      await createNotification(
        supervisorQuery.rows[0].id, "clearance",
        "Thesis Clearance Pending",
        "One of your students has applied for graduation clearance. Please review their Thesis Submission step.",
        "info"
      );
    }

    // Notify Dean / ViceDean
    const deans = await db.query(`SELECT id FROM users WHERE role IN ('Dean','ViceDean') AND is_active = true`);
    for (const u of deans.rows) {
      await createNotification(u.id, "clearance", "Clearance Pending", "A student has applied for graduation clearance.", "info");
    }

    res.json({ message: "Clearance application submitted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clearance/init/:studentId
exports.initSteps = async (req, res) => {
  try {
    // Add supervisor_user_id column if it doesn't exist yet
    await db.query(`
      ALTER TABLE clearance_steps
      ADD COLUMN IF NOT EXISTS supervisor_user_id integer REFERENCES users(id) ON DELETE SET NULL
    `);

    // Look up the student's primary supervisor user_id
    const supRes = await db.query(
      `SELECT u.id FROM student_supervisors ss
       JOIN supervisors sv ON ss.supervisor_id = sv.id
       JOIN users u ON sv.user_id = u.id
       WHERE ss.student_id = $1 AND ss.is_primary = true
       LIMIT 1`,
      [req.params.studentId]
    );
    const supervisorUserId = supRes.rows[0]?.id ?? null;

    const steps = [
      { department: "School Fees",          description: "All outstanding fees must be settled",      step_order: 1, sup: null },
      { department: "Library",              description: "Return all borrowed books and clear fines",  step_order: 2, sup: null },
      { department: "Department",           description: "Academic clearance from your department",    step_order: 3, sup: null },
      { department: "Thesis Submission",    description: "Final bound thesis submitted",               step_order: 4, sup: supervisorUserId },
      { department: "ICT Directorate",      description: "Return all university-issued devices",       step_order: 5, sup: null },
      { department: "Dean of Postgraduate", description: "Final approval from the Dean",               step_order: 6, sup: null },
    ];

    for (const s of steps) {
      await db.query(
        `INSERT INTO clearance_steps (student_id, department, description, step_order, supervisor_user_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, department) DO UPDATE SET supervisor_user_id = EXCLUDED.supervisor_user_id`,
        [req.params.studentId, s.department, s.description, s.step_order, s.sup]
      );
    }
    res.status(201).json({ message: "Clearance steps initialized" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
