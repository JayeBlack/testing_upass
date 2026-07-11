const db = require("../db");
const { createNotification } = require("./notificationController");
const { uploadToCloudinary, useCloudinary } = require("../middleware/upload");

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

    // Get assigned students count
    const studentsResult = await db.query(
      "SELECT COUNT(*) as count FROM student_supervisors WHERE supervisor_id = $1",
      [supervisorId]
    );
    const assignedStudents = parseInt(studentsResult.rows[0].count, 10);

    // Get assigned student IDs
    const studentIdsResult = await db.query(
      "SELECT student_id FROM student_supervisors WHERE supervisor_id = $1",
      [supervisorId]
    );
    const studentIds = studentIdsResult.rows.map(row => row.student_id);

    let pendingReviews = 0;
    let awaitingApproval = 0;

    if (studentIds.length > 0) {
      // Count thesis submissions with status 'Pending' for assigned students
      const pendingResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM thesis_submissions 
         WHERE student_id = ANY($1) 
         AND status = 'Pending'`,
        [studentIds]
      );
      pendingReviews = parseInt(pendingResult.rows[0].count, 10);

      // Count thesis submissions with status 'Reviewed' or 'Awaiting Approval' for assigned students
      const awaitingResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM thesis_submissions 
         WHERE student_id = ANY($1) 
         AND (status = 'Reviewed' OR status = 'Awaiting Approval')`,
        [studentIds]
      );
      awaitingApproval = parseInt(awaitingResult.rows[0].count, 10);
    }

    res.json({
      assignedStudents,
      pendingReviews,
      awaitingApproval,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/current/review-stats
exports.getReviewStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const supervisorResult = await db.query(
      "SELECT id FROM supervisors WHERE user_id = $1",
      [userId]
    );
    if (supervisorResult.rows.length === 0) {
      return res.json({ avg_review_time_days: 0 });
    }
    const supervisorId = supervisorResult.rows[0].id;

    // Get assigned student IDs
    const studentsResult = await db.query(
      "SELECT student_id FROM student_supervisors WHERE supervisor_id = $1",
      [supervisorId]
    );
    const studentIds = studentsResult.rows.map(row => row.student_id);

    if (studentIds.length === 0) {
      return res.json({ avg_review_time_days: 0 });
    }

    // Calculate average review time for reviewed submissions
    const reviewTimeResult = await db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 86400) as avg_days
       FROM thesis_submissions
       WHERE student_id = ANY($1) AND reviewed_at IS NOT NULL AND reviewed_by = $2`,
      [studentIds, userId]
    );

    const avgDays = reviewTimeResult.rows[0]?.avg_days || 0;
    res.json({ avg_review_time_days: parseFloat(avgDays) });
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
      return res.json({ studentIds: [], students: [] });
    }

    const studentDetails = await db.query(
      `SELECT s.id, 
              CONCAT(u.first_name, ' ', u.last_name) as name, 
              s.index_number,
              p.name AS program_name,
              d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = ANY($1)
       ORDER BY u.last_name`,
      [studentIds]
    );

    res.json({
      studentIds,
      students: studentDetails.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/student/resources
exports.getStudentResources = async (req, res) => {
  try {
    const userId = req.user.id;
    const sq = await db.query("SELECT id FROM students WHERE user_id = $1", [userId]);
    if (sq.rows.length === 0) return res.json([]);
    const studentId = sq.rows[0].id;
    const result = await db.query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS uploader_name,
              (srr.id IS NOT NULL) AS is_read
       FROM resources r
       JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN student_resource_reads srr
         ON srr.item_type = 'resource' AND srr.item_id = r.id AND srr.student_id = $2
       WHERE r.recipient_student_ids @> $1::jsonb
       ORDER BY r.uploaded_at DESC`,
      [JSON.stringify([studentId]), studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/student/announcements
exports.getStudentAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const sq = await db.query("SELECT id FROM students WHERE user_id = $1", [userId]);
    if (sq.rows.length === 0) return res.json([]);
    const studentId = sq.rows[0].id;
    const result = await db.query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS author_name,
              (srr.id IS NOT NULL) AS is_read
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       LEFT JOIN student_resource_reads srr
         ON srr.item_type = 'announcement' AND srr.item_id = a.id AND srr.student_id = $2
       WHERE a.recipient_student_ids @> $1::jsonb
       ORDER BY a.created_at DESC`,
      [JSON.stringify([studentId]), studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/supervisors/student/mark-read
exports.markItemRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id } = req.body;
    const sq = await db.query("SELECT id FROM students WHERE user_id = $1", [userId]);
    if (sq.rows.length === 0) return res.json({ ok: true });
    const studentId = sq.rows[0].id;
    await db.query(
      `INSERT INTO student_resource_reads (student_id, item_type, item_id)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [studentId, item_type, item_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/supervisors/resources/upload
exports.uploadResource = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { title, category, description, student_ids } = req.body;
    if (!title || !category) return res.status(400).json({ error: "Missing required fields" });

    let studentIdArray = [];
    if (student_ids) {
      try {
        const parsed = JSON.parse(student_ids);
        if (!Array.isArray(parsed)) throw new Error("Invalid student_ids");
        studentIdArray = parsed.filter(id => Number.isInteger(Number(id))).map(Number);
      } catch { return res.status(400).json({ error: "Invalid student_ids format" }); }
    }

    let fileUrl;
    if (useCloudinary) {
      const uploaded = await uploadToCloudinary(req.file.buffer, req.file.originalname, "upass/resources");
      fileUrl = uploaded.secure_url;
    } else {
      fileUrl = `/uploads/supervisor-resources/${req.file.filename}`;
    }

    const result = await db.query(
      `INSERT INTO resources (uploaded_by, name, file_name, file_url, file_type, file_size, category, description, recipient_student_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user.id, title, req.file.originalname, fileUrl,
       req.file.originalname.split('.').pop()?.toUpperCase() || 'FILE',
       `${Math.round(req.file.size / 1024)} KB`, category, description || null, JSON.stringify(studentIdArray)]
    );
    const resourceId = result.rows[0].id;

    // Notify each recipient student
    for (const studentId of studentIdArray) {
      const sq = await db.query('SELECT user_id FROM students WHERE id = $1', [studentId]);
      if (sq.rows.length > 0) {
        await createNotification(sq.rows[0].user_id, 'resource', 'New Resource from Supervisor', `${title} has been shared with you.`, 'info');
      }
    }

    res.status(201).json({ resource_id: resourceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/resources
exports.getResources = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM resources WHERE uploaded_by = $1 ORDER BY uploaded_at DESC`,
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
      "DELETE FROM resources WHERE id = $1 AND uploaded_by = $2 RETURNING id",
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
  try {
    const { text, visibility, scheduled_at, student_ids } = req.body;
    if (!text) return res.status(400).json({ error: "Announcement text required" });
    let studentIdArray = [];
    if (student_ids) {
      try {
        const parsed = JSON.parse(student_ids);
        if (!Array.isArray(parsed)) throw new Error("Invalid student_ids");
        studentIdArray = parsed.filter(id => Number.isInteger(Number(id))).map(Number);
      } catch { return res.status(400).json({ error: "Invalid student_ids format" }); }
    }

    const result = await db.query(
      `INSERT INTO announcements (author_id, text, visibility, scheduled_at, recipient_student_ids)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, text, visibility || 'All Students', scheduled_at || null, JSON.stringify(studentIdArray)]
    );
    const announcementId = result.rows[0].id;

    for (const studentId of studentIdArray) {
      const sq = await db.query('SELECT user_id FROM students WHERE id = $1', [studentId]);
      if (sq.rows.length > 0) {
        await createNotification(sq.rows[0].user_id, 'announcement', 'Announcement from Supervisor', text.substring(0, 100) + (text.length > 100 ? '...' : ''), 'info');
      }
    }

    res.status(201).json({ announcement_id: announcementId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/supervisors/announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM announcements WHERE author_id = $1 ORDER BY created_at DESC`,
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
      "DELETE FROM announcements WHERE id = $1 AND author_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
