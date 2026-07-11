const db = require("../db");

// Helper function to create notification
async function createNotification(userId, type, title, message, severity = 'info') {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, severity) VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, message, type, severity]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/notifications/activity  — role-aware recent activity feed
exports.getActivity = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const activities = [];

    if (role === 'Student') {
      const s = await db.query(
        `SELECT s.id, s.admission_cycle FROM students s WHERE s.user_id = $1`, [userId]
      );
      if (s.rows.length > 0) {
        const sid = s.rows[0].id;

        // Course registrations
        const courses = await db.query(
          `SELECT cr.registered_at, c.name, c.code FROM course_registrations cr
           JOIN courses c ON cr.course_id = c.id
           WHERE cr.student_id = $1 AND cr.status = 'Registered'
           ORDER BY cr.registered_at DESC LIMIT 5`, [sid]
        );
        courses.rows.forEach(r => activities.push({
          text: `Registered for ${r.code} — ${r.name}`,
          time: r.registered_at, type: 'course'
        }));

        // Fee records
        const fees = await db.query(
          `SELECT updated_at, academic_year, semester, status, amount_paid FROM fee_records
           WHERE student_id = $1 ORDER BY updated_at DESC LIMIT 3`, [sid]
        );
        fees.rows.forEach(r => activities.push({
          text: `Fee payment ${r.status.toLowerCase()} — ${r.academic_year} ${r.semester} (GHS ${parseFloat(r.amount_paid).toLocaleString()})`,
          time: r.updated_at, type: 'fee'
        }));

        // Thesis submissions
        const thesis = await db.query(
          `SELECT submitted_at, stage, status FROM thesis_submissions
           WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 3`, [sid]
        );
        thesis.rows.forEach(r => activities.push({
          text: `Thesis ${r.stage} submitted — status: ${r.status}`,
          time: r.submitted_at, type: 'thesis'
        }));

        // Grades
        const grades = await db.query(
          `SELECT g.entered_at, c.name, c.code, g.grade, g.marks FROM grades g
           JOIN courses c ON g.course_id = c.id
           WHERE g.student_id = $1 ORDER BY g.entered_at DESC LIMIT 5`, [sid]
        );
        grades.rows.forEach(r => activities.push({
          text: `Result published — ${r.code} ${r.name}: ${r.grade} (${r.marks}%)`,
          time: r.entered_at, type: 'result'
        }));

        // Clearance
        const clearance = await db.query(
          `SELECT cleared_at, department, status FROM clearance_steps
           WHERE student_id = $1 AND status != 'not_started' ORDER BY cleared_at DESC LIMIT 3`, [sid]
        );
        clearance.rows.forEach(r => activities.push({
          text: `Clearance ${r.status} — ${r.department}`,
          time: r.cleared_at, type: 'clearance'
        }));
      }

      // Notifications received
      const notifs = await db.query(
        `SELECT created_at, title, type FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]
      );
      notifs.rows.forEach(r => activities.push({ text: r.title, time: r.created_at, type: r.type || 'general' }));

    } else if (role === 'Supervisor') {
      // Thesis submitted by assigned students
      const sup = await db.query(`SELECT id FROM supervisors WHERE user_id = $1`, [userId]);
      if (sup.rows.length > 0) {
        const supId = sup.rows[0].id;
        const submitted = await db.query(
          `SELECT ts.submitted_at, ts.stage, ts.status, u.first_name, u.last_name, s.index_number
           FROM thesis_submissions ts
           JOIN students s ON ts.student_id = s.id
           JOIN users u ON s.user_id = u.id
           JOIN student_supervisors ss ON ss.student_id = s.id
           WHERE ss.supervisor_id = $1
           ORDER BY ts.submitted_at DESC LIMIT 8`, [supId]
        );
        submitted.rows.forEach(r => activities.push({
          text: `${r.first_name} ${r.last_name} (${r.index_number}) submitted ${r.stage} — ${r.status}`,
          time: r.submitted_at, type: 'thesis'
        }));

        // Students assigned
        const assigned = await db.query(
          `SELECT ss.assigned_at, u.first_name, u.last_name, s.index_number
           FROM student_supervisors ss
           JOIN students s ON ss.student_id = s.id
           JOIN users u ON s.user_id = u.id
           WHERE ss.supervisor_id = $1
           ORDER BY ss.assigned_at DESC LIMIT 5`, [supId]
        );
        assigned.rows.forEach(r => activities.push({
          text: `${r.first_name} ${r.last_name} (${r.index_number}) assigned to you`,
          time: r.assigned_at, type: 'general'
        }));
      }
      const notifs = await db.query(
        `SELECT created_at, title, type FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]
      );
      notifs.rows.forEach(r => activities.push({ text: r.title, time: r.created_at, type: r.type || 'general' }));

    } else if (['Admin','Dean','ViceDean','Registrar','AdminAssistant'].includes(role)) {
      // New students enrolled
      const enrolled = await db.query(
        `SELECT s.created_at, u.first_name, u.last_name, s.index_number, d.name as dept
         FROM students s JOIN users u ON s.user_id = u.id
         LEFT JOIN departments d ON s.department_id = d.id
         ORDER BY s.created_at DESC LIMIT 6`
      );
      enrolled.rows.forEach(r => activities.push({
        text: `New student enrolled: ${r.first_name} ${r.last_name} (${r.index_number}) — ${r.dept || 'N/A'}`,
        time: r.created_at, type: 'general'
      }));

      // Fee records updated
      const fees = await db.query(
        `SELECT fr.updated_at, u.first_name, u.last_name, fr.status, fr.academic_year
         FROM fee_records fr JOIN students s ON fr.student_id = s.id
         JOIN users u ON s.user_id = u.id
         ORDER BY fr.updated_at DESC LIMIT 5`
      );
      fees.rows.forEach(r => activities.push({
        text: `Fee ${r.status.toLowerCase()} — ${r.first_name} ${r.last_name}, ${r.academic_year}`,
        time: r.updated_at, type: 'fee'
      }));

      // Clearance steps
      const clearance = await db.query(
        `SELECT cs.cleared_at, u.first_name, u.last_name, cs.department, cs.status
         FROM clearance_steps cs JOIN students s ON cs.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE cs.status != 'not_started' AND cs.cleared_at IS NOT NULL
         ORDER BY cs.cleared_at DESC LIMIT 5`
      );
      clearance.rows.forEach(r => activities.push({
        text: `Clearance ${r.status} for ${r.first_name} ${r.last_name} — ${r.department}`,
        time: r.cleared_at, type: 'clearance'
      }));

      const notifs = await db.query(
        `SELECT created_at, title, type FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]
      );
      notifs.rows.forEach(r => activities.push({ text: r.title, time: r.created_at, type: r.type || 'general' }));

    } else if (role === 'Accountant' || role === 'AccountingAssistant') {
      const fees = await db.query(
        `SELECT fr.updated_at, u.first_name, u.last_name, fr.status, fr.amount_paid, fr.academic_year, fr.semester
         FROM fee_records fr JOIN students s ON fr.student_id = s.id
         JOIN users u ON s.user_id = u.id
         ORDER BY fr.updated_at DESC LIMIT 10`
      );
      fees.rows.forEach(r => activities.push({
        text: `Payment ${r.status.toLowerCase()} — ${r.first_name} ${r.last_name}, GHS ${parseFloat(r.amount_paid).toLocaleString()} (${r.academic_year} ${r.semester})`,
        time: r.updated_at, type: 'fee'
      }));

      const notifs = await db.query(
        `SELECT created_at, title, type FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]
      );
      notifs.rows.forEach(r => activities.push({ text: r.title, time: r.created_at, type: r.type || 'general' }));

    } else if (role === 'ExamsOfficer') {
      // Result batches
      const batches = await db.query(
        `SELECT rb.created_at, rb.status, rb.academic_year, rb.semester, rb.student_count
         FROM result_batches rb ORDER BY rb.created_at DESC LIMIT 6`
      );
      batches.rows.forEach(r => activities.push({
        text: `Results batch ${r.status.toLowerCase()} — ${r.academic_year} Sem ${r.semester} (${r.student_count} students)`,
        time: r.created_at, type: 'result'
      }));

      // Grades entered
      const grades = await db.query(
        `SELECT g.entered_at, c.name, c.code, COUNT(*) as cnt
         FROM grades g JOIN courses c ON g.course_id = c.id
         GROUP BY g.entered_at, c.name, c.code
         ORDER BY g.entered_at DESC LIMIT 5`
      );
      grades.rows.forEach(r => activities.push({
        text: `Grades entered for ${r.code} — ${r.name}`,
        time: r.entered_at, type: 'result'
      }));

      const notifs = await db.query(
        `SELECT created_at, title, type FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]
      );
      notifs.rows.forEach(r => activities.push({ text: r.title, time: r.created_at, type: r.type || 'general' }));
    }

    // Sort all by time desc, take top 10
    const sorted = activities
      .filter(a => a.time)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)
      .map(a => ({ ...a, time: a.time }));

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/notifications
exports.getForUser = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, user_id, title, message, type, severity, is_read, created_at, download_url FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [req.user.id]);
    res.json({ message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/notifications/:id
exports.remove = async (req, res) => {
  try {
    await db.query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/notifications (admin/system use)
exports.create = async (req, res) => {
  try {
    const { user_id, title, message, type, severity } = req.body;
    const result = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, severity) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, title, message, type || "general", severity || "info"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/notifications/broadcast — send to all students or a specific department
exports.broadcast = async (req, res) => {
  try {
    const { title, message, type = "general", severity = "info", download_url, department } = req.body;
    if (!title || !message) return res.status(400).json({ error: "Title and message are required" });

    let studentsQuery;
    if (department && department !== "All Students" && department !== "Students with Outstanding Fees") {
      studentsQuery = await db.query(
        `SELECT s.user_id FROM students s
         JOIN departments d ON s.department_id = d.id
         WHERE s.user_id IS NOT NULL AND d.name = $1`,
        [department]
      );
    } else {
      studentsQuery = await db.query("SELECT user_id FROM students WHERE user_id IS NOT NULL");
    }

    const userIds = studentsQuery.rows.map((r) => r.user_id);
    if (userIds.length === 0) return res.status(400).json({ error: "No students found for the selected audience" });

    const values = [];
    const params = [];
    let idx = 1;
    userIds.forEach((uid) => {
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(uid, title, message, type, severity, download_url || null);
    });

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, download_url) VALUES ${values.join(", ")}`,
      params
    );

    // Store broadcast record for accountant's sent notices list
    const audienceLabel = department && department !== "All Students" ? department : "All Students";
    await db.query(
      `INSERT INTO broadcast_logs (sent_by, title, message, type, recipient_count, download_url, audience)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, title, message, type, userIds.length, download_url || null, audienceLabel]
    ).catch(() => {});

    res.status(201).json({ sent: userIds.length, message: `Notification sent to ${userIds.length} students` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/notifications/sent-broadcasts — accountant's sent fee notices
exports.getSentBroadcasts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, message, type, recipient_count, download_url, audience, created_at
       FROM broadcast_logs
       WHERE sent_by = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch {
    // Table may not exist yet — return empty
    res.json([]);
  }
};

// Export helper for use in other controllers
exports.createNotification = createNotification;
