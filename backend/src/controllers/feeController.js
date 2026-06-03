const db = require("../db");
const XLSX = require("xlsx");

// GET /api/fees/student/:studentId
exports.getByStudent = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM fee_records WHERE student_id = $1 ORDER BY academic_year DESC, semester",
      [req.params.studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/fees (all — admin/accountant)
exports.getAll = async (req, res) => {
  try {
    const { department, status, search } = req.query;
    let sql = `
      SELECT f.*, s.index_number, u.first_name, u.last_name, d.name AS department_name
      FROM fee_records f
      JOIN students s ON f.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (department) { sql += ` AND d.name = $${idx++}`; params.push(department); }
    if (status === "cleared") { sql += " AND f.is_cleared = TRUE"; }
    if (status === "owing") { sql += " AND f.is_cleared = FALSE"; }
    if (search) {
      sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR s.index_number ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    sql += " ORDER BY u.last_name";
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/payment
exports.makePayment = async (req, res) => {
  try {
    const { fee_record_id, amount, payment_method, reference, receipt_url } = req.body;
    const payment = await db.query(
      `INSERT INTO payments (fee_record_id, amount, payment_method, reference, receipt_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fee_record_id, amount, payment_method, reference, receipt_url]
    );

    // Update fee record
    await db.query(
      `UPDATE fee_records SET amount_paid = amount_paid + $1, updated_at = NOW() WHERE id = $2`,
      [amount, fee_record_id]
    );

    // Auto-update status
    await db.query(
      `UPDATE fee_records SET
        status = CASE WHEN amount_paid >= total_amount THEN 'Paid' ELSE 'Partial' END,
        is_cleared = (amount_paid >= total_amount)
       WHERE id = $1`,
      [fee_record_id]
    );

    res.status(201).json(payment.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/fees/:id/clearance
exports.toggleClearance = async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE fee_records SET is_cleared = NOT is_cleared, updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Fee record not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/fees/summary (analytics)
exports.getSummary = async (req, res) => {
  try {
    const { academic_year, department } = req.query;
    let sql = `
      SELECT
        COUNT(*) AS total_students,
        SUM(total_amount) AS total_fees,
        SUM(amount_paid) AS total_paid,
        SUM(outstanding) AS total_outstanding,
        COUNT(*) FILTER (WHERE is_cleared) AS cleared_count,
        COUNT(*) FILTER (WHERE NOT is_cleared) AS owing_count,
        ROUND(COUNT(*) FILTER (WHERE is_cleared) * 100.0 / NULLIF(COUNT(*), 0), 1) AS compliance_rate
      FROM fee_records f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (academic_year) { sql += ` AND f.academic_year = $${idx++}`; params.push(academic_year); }
    if (department) { sql += ` AND d.name = $${idx++}`; params.push(department); }

    const result = await db.query(sql, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/parse-bulk
// Accepts multipart file (CSV or XLSX)
// Returns parsed rows: { rows: [{ index_number, total_amount, academic_year, semester }, ...] }
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
      index_number: ["index", "indexnumber", "indexno", "studentid", "regno", "regnumber"],
      total_amount: ["amount", "totalamount", "fee", "fees", "totalfee", "totalfees"],
      academic_year: ["year", "academicyear", "academicyear", "session"],
      semester: ["semester", "sem", "term"],
    };
    for (const [field, aliases] of Object.entries(knownCols)) {
      const idx = normalized.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }
    if (Object.keys(colMap).length < 2) {
      colMap.index_number = 0;
      colMap.total_amount = 1;
      colMap.academic_year = 2;
      colMap.semester = 3;
    }

    // parse rows
    const parsed = rows.slice(1).map((cols) => ({
      index_number: (cols[colMap.index_number ?? 0] || "").toString().trim(),
      total_amount: parseFloat((cols[colMap.total_amount ?? 1] || "0").toString().replace(/[^\d.]/g, "")) || 0,
      academic_year: (cols[colMap.academic_year ?? 2] || "").toString().trim(),
      semester: (cols[colMap.semester ?? 3] || "").toString().trim(),
    })).filter((f) => f.index_number && f.total_amount > 0);

    if (parsed.length === 0) {
      return res.status(400).json({ error: "No valid fee records found" });
    }

    res.json({ rows: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/upload-bulk
// Accepts: { fees: [{ index_number, total_amount, academic_year, semester }, ...] }
// Creates fee records for multiple students
exports.uploadBulk = async (req, res) => {
  try {
    const { fees } = req.body;
    if (!Array.isArray(fees) || fees.length === 0) {
      return res.status(400).json({ error: "No fee records to upload" });
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < fees.length; i++) {
      const { index_number, total_amount, academic_year, semester } = fees[i];
      if (!index_number || !total_amount) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      try {
        // Find student by index number
        const student = await db.query(
          "SELECT id FROM students WHERE index_number = $1",
          [index_number]
        );

        if (student.rows.length === 0) {
          errors.push(`Row ${i + 1}: Student with index ${index_number} not found`);
          continue;
        }

        const studentId = student.rows[0].id;
        const year = academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
        const sem = semester || "First";

        // Check if record already exists
        const existing = await db.query(
          "SELECT id FROM fee_records WHERE student_id = $1 AND academic_year = $2 AND semester = $3",
          [studentId, year, sem]
        );

        if (existing.rows.length > 0) {
          errors.push(`Row ${i + 1}: Fee record already exists for ${index_number} in ${year} ${sem}`);
          continue;
        }

        // Create fee record
        const result = await db.query(
          `INSERT INTO fee_records (student_id, academic_year, semester, total_amount, amount_paid, status, is_cleared)
           VALUES ($1, $2, $3, $4, 0, 'Unpaid', FALSE)
           RETURNING *`,
          [studentId, year, sem, total_amount]
        );

        created.push({ index_number, ...result.rows[0] });
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    res.status(201).json({ created, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
