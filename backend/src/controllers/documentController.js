const db = require("../db");
const path = require("path");
const fs = require("fs").promises;
const { createNotification } = require("./notificationController");

// GET /api/documents (all — admin/registrar)
exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dr.*, u.first_name, u.last_name, s.index_number, p.name AS program_name, d.name AS department_name
       FROM document_requests dr
       JOIN students s ON dr.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       ORDER BY dr.requested_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/documents/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM document_requests WHERE student_id = $1 ORDER BY requested_at DESC",
      [req.params.studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/documents
exports.create = async (req, res) => {
  try {
    const { student_id, doc_type, purpose } = req.body;
    const result = await db.query(
      `INSERT INTO document_requests (student_id, doc_type, purpose) VALUES ($1::integer, $2, $3) RETURNING *`,
      [student_id, doc_type, purpose]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/documents/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      `UPDATE document_requests SET status = $1, completed_at = CASE WHEN $1 = 'Ready' THEN NOW() ELSE NULL END,
       processed_by = $2 WHERE id = $3 RETURNING *`,
      [status, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Request not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/documents/dean/upload
// Upload document and send to selected students
exports.uploadForStudents = async (req, res) => {
  const client = await db.pool.connect();
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const { title, student_ids, request_id } = req.body;
    if (!title || !student_ids) {
      return res.status(400).json({ error: "Missing title or student_ids" });
    }

    const studentIdArray = JSON.parse(student_ids);
    if (!Array.isArray(studentIdArray) || studentIdArray.length === 0) {
      return res.status(400).json({ error: "No students selected" });
    }

    await client.query("BEGIN");

    // Store file metadata
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const uploadResult = await client.query(
      `INSERT INTO document_uploads (title, file_name, file_url, uploaded_by, recipient_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, req.file.originalname, fileUrl, req.user.id, studentIdArray.length]
    );
    const uploadId = uploadResult.rows[0].id;

    // If request_id is provided, update existing request instead of creating new one
    if (request_id) {
      await client.query(
        `UPDATE document_requests 
         SET status = $1, file_url = $2, upload_id = $3, completed_at = NOW(), processed_by = $4 
         WHERE id = $5`,
        ['Ready', fileUrl, uploadId, req.user.id, request_id]
      );
      
      // Get student's user_id for notification
      const requestInfo = await client.query(
        'SELECT s.user_id, dr.doc_type FROM document_requests dr JOIN students s ON dr.student_id = s.id WHERE dr.id = $1',
        [request_id]
      );
      if (requestInfo.rows.length > 0) {
        await createNotification(
          requestInfo.rows[0].user_id,
          'document',
          'Document Ready',
          `Your ${requestInfo.rows[0].doc_type} request has been processed and is ready for download.`,
          'info'
        );
      }
    } else {
      // Create new document records for each student (bulk upload scenario)
      for (const studentId of studentIdArray) {
        await client.query(
          `INSERT INTO document_requests (student_id, doc_type, purpose, status, file_url, upload_id)
           VALUES ($1::integer, $2, $3, $4, $5, $6)`,
          [studentId, title, `Uploaded by ${req.user.first_name || req.user.name || 'Dean'}`, 'Ready', fileUrl, uploadId]
        );

        // Get student's user_id for notification
        const studentQuery = await client.query(
          'SELECT user_id FROM students WHERE id = $1',
          [studentId]
        );
        if (studentQuery.rows.length > 0) {
          await createNotification(
            studentQuery.rows[0].user_id,
            'document',
            'New Document Available',
            `${title} has been uploaded for you. Check your documents page.`,
            'info'
          );
        }
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Document sent to students", upload_id: uploadId });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/documents/dean/uploads
// Get all uploads made by dean
exports.getDeanUploads = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM document_uploads WHERE uploaded_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
