const db = require("../db");
const { createNotification } = require("./notificationController");

// GET /api/supervisors
exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url, d.name AS department_name
       FROM supervisors s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.is_active = TRUE
       ORDER BY u.last_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/:id
exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url, d.name AS department_name
       FROM supervisors s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Supervisor not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/:id/students
exports.getAssignedStudents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.id, 
              CONCAT(u.first_name, ' ', u.last_name) AS name,
              s.index_number,
              p.name AS program_name,
              d.name AS department_name,
              ss.assigned_at
       FROM student_supervisors ss
       JOIN students s ON ss.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE ss.supervisor_id = $1
       ORDER BY u.last_name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/supervisors/assignments/:assignmentId
exports.unassignStudent = async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM student_supervisors WHERE id = $1 RETURNING id",
      [req.params.assignmentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Assignment not found" });
    res.json({ message: "Unassigned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ss.id, ss.student_id, ss.supervisor_id, ss.is_primary, ss.assigned_at,
              CONCAT(su.first_name, ' ', su.last_name) AS student_name,
              s.index_number,
              p.name AS program_name,
              d.name AS department_name,
              CONCAT(uu.first_name, ' ', uu.last_name) AS supervisor_name
       FROM student_supervisors ss
       JOIN students s ON ss.student_id = s.id
       JOIN users su ON s.user_id = su.id
       JOIN users uu ON ss.supervisor_id IN (SELECT id FROM supervisors WHERE user_id = uu.id)
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       ORDER BY ss.assigned_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/supervisors/:id/assign
exports.assignStudent = async (req, res) => {
  try {
    const { student_id, is_primary } = req.body;
    const result = await db.query(
      `INSERT INTO student_supervisors (student_id, supervisor_id, is_primary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [student_id, req.params.id, is_primary !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Already assigned" });
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/current/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const supervisorResult = await db.query(
      "SELECT id FROM supervisors WHERE user_id = $1",
      [userId]
    );
    if (supervisorResult.rows.length === 0) {
      return res.status(404).json({ error: "Supervisor record not found" });
    }
    const supervisorId = supervisorResult.rows[0].id;

    const studentsResult = await db.query(
      "SELECT COUNT(*) as count FROM student_supervisors WHERE supervisor_id = $1",
      [supervisorId]
    );
    const assignedStudents = parseInt(studentsResult.rows[0].count, 10);

    res.json({
      assignedStudents,
      pendingReviews: 0,
      approvedThisMonth: 0,
      avgReviewTime: "—",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/current/submissions
exports.getCurrentSupervisorSubmissions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const supervisorResult = await db.query(
      "SELECT id FROM supervisors WHERE user_id = $1",
      [userId]
    );
    if (supervisorResult.rows.length === 0) {
      return res.status(404).json({ error: "Supervisor record not found" });
    }
    const supervisorId = supervisorResult.rows[0].id;

    const studentsResult = await db.query(
      "SELECT student_id FROM student_supervisors WHERE supervisor_id = $1",
      [supervisorId]
    );
    const studentIds = studentsResult.rows.map(row => row.student_id);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const studentNames = await db.query(
      `SELECT s.id, CONCAT(u.first_name, ' ', u.last_name) as name, s.index_number
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ANY($1)`,
      [studentIds]
    );

    res.json({
      studentIds,
      students: studentNames.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/supervisors/resources/upload
exports.uploadResource = async (req, res) => {
  const client = await db.pool.connect();
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const { title, category, description, student_ids } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studentIdArray = student_ids ? JSON.parse(student_ids) : [];
    const fileUrl = `/uploads/supervisor-resources/${req.file.filename}`;

    await client.query("BEGIN");

    const resourceResult = await client.query(
      `INSERT INTO supervisor_resources (supervisor_id, title, file_url, category, description, file_size)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.id, title, fileUrl, category, description || null, req.file.size]
    );
    const resourceId = resourceResult.rows[0].id;

    for (const studentId of studentIdArray) {
      await client.query(
        `INSERT INTO supervisor_resource_recipients (resource_id, student_id) VALUES ($1, $2)`,
        [resourceId, studentId]
      );

      const studentQuery = await client.query('SELECT user_id FROM students WHERE id = $1', [studentId]);
      if (studentQuery.rows.length > 0) {
        await createNotification(
          studentQuery.rows[0].user_id,
          'resource',
          'New Resource from Supervisor',
          `${title} has been shared with you.`,
          'info'
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ resource_id: resourceId });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/supervisors/resources
exports.getResources = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM supervisor_resources WHERE supervisor_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/supervisors/resources/:id
exports.deleteResource = async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM supervisor_resources WHERE id = $1 AND supervisor_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Resource not found" });
    res.json({ message: "Resource deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/supervisors/announcements
exports.createAnnouncement = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { text, visibility, scheduled_at, student_ids } = req.body;
    if (!text) return res.status(400).json({ error: "Announcement text required" });

    const studentIdArray = student_ids ? JSON.parse(student_ids) : [];

    await client.query("BEGIN");

    const announcementResult = await client.query(
      `INSERT INTO supervisor_announcements (supervisor_id, text, visibility, scheduled_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, text, visibility || "All Students", scheduled_at || null]
    );
    const announcementId = announcementResult.rows[0].id;

    for (const studentId of studentIdArray) {
      await client.query(
        `INSERT INTO supervisor_announcement_recipients (announcement_id, student_id) VALUES ($1, $2)`,
        [announcementId, studentId]
      );

      const studentQuery = await client.query('SELECT user_id FROM students WHERE id = $1', [studentId]);
      if (studentQuery.rows.length > 0) {
        await createNotification(
          studentQuery.rows[0].user_id,
          'announcement',
          'Announcement from Supervisor',
          text.substring(0, 100) + (text.length > 100 ? "..." : ""),
          'info'
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ announcement_id: announcementId });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/supervisors/announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM supervisor_announcements WHERE supervisor_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/supervisors/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM supervisor_announcements WHERE id = $1 AND supervisor_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
