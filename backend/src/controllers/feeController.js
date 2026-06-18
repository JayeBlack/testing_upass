const db = require("../db");
const XLSX = require("xlsx");

// GET /api/fees/student/:studentId — accepts user_id or student_id
exports.getByStudent = async (req, res) => {
  try {
    const paramId = req.params.studentId;
    // First try to find if this is a users.id — look up the student record
    const studentLookup = await db.query(
      "SELECT id FROM students WHERE user_id = $1",
      [paramId]
    );
    let studentId;
    if (studentLookup.rows.length > 0) {
      // It's a users.id — use the corresponding students.id
      studentId = studentLookup.rows[0].id;
    } else {
      // Try direct student_id match
      studentId = paramId;
    }
    const result = await db.query(
      "SELECT * FROM fee_records WHERE student_id = $1 ORDER BY academic_year DESC, semester",
      [studentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/fees (all — admin/accountant)
exports.getAll = async (req, res) => {
  try {
    console.log(`[Get All Fees] Request from user: ${req.user?.email}, role: ${req.user?.role}`);
    const { department, status, search } = req.query;
    let sql = `
      SELECT f.*, s.index_number, u.first_name, u.last_name, d.name AS department_name, p.name AS program_name
      FROM fee_records f
      JOIN students s ON f.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN programs p ON s.program_id = p.id
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
    console.log(`[Get All Fees] Found ${result.rows.length} fee records`);
    res.json(result.rows);
  } catch (err) {
    console.error(`[Get All Fees] Error:`, err.message);
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
    console.log(`[Fee Summary] Request from user: ${req.user?.email}, role: ${req.user?.role}`);
    console.log(`[Fee Summary] Filters - academic_year: ${academic_year}, department: ${department}`);
    
    let sql = `
      SELECT
        COUNT(*)::INTEGER AS total_students,
        COALESCE(SUM(total_amount), 0)::NUMERIC AS total_fees,
        COALESCE(SUM(amount_paid), 0)::NUMERIC AS total_paid,
        COALESCE(SUM(total_amount - amount_paid), 0)::NUMERIC AS total_outstanding,
        COUNT(*) FILTER (WHERE is_cleared)::INTEGER AS cleared_count,
        COUNT(*) FILTER (WHERE NOT is_cleared)::INTEGER AS owing_count,
        COALESCE(ROUND(COUNT(*) FILTER (WHERE is_cleared) * 100.0 / NULLIF(COUNT(*), 0), 1), 0)::NUMERIC AS compliance_rate
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
    const summary = result.rows[0];
    
    // Convert all values to actual numbers
    const response = {
      total_students: parseInt(summary.total_students) || 0,
      total_fees: parseFloat(summary.total_fees) || 0,
      total_paid: parseFloat(summary.total_paid) || 0,
      total_outstanding: parseFloat(summary.total_outstanding) || 0,
      cleared_count: parseInt(summary.cleared_count) || 0,
      owing_count: parseInt(summary.owing_count) || 0,
      compliance_rate: parseFloat(summary.compliance_rate) || 0
    };
    
    console.log(`[Fee Summary] Query result:`, response);
    res.json(response);
  } catch (err) {
    console.error(`[Fee Summary] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/parse-bulk
// Accepts multipart file (CSV or XLSX)
// Returns parsed rows: { rows: [{ index_number, total_amount, amount_paid, academic_year, semester }, ...] }
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
      total_amount: ["amount", "totalamount", "fee", "fees", "totalfee", "totalfees", "totalfee"],
      amount_paid: ["amountpaid", "paid", "payamount", "paymentamount", "paidamount", "amountpaid"],
      academic_year: ["year", "academicyear", "academicyear", "session", "academicyear"],
      semester: ["semester", "sem", "term"],
    };
    for (const [field, aliases] of Object.entries(knownCols)) {
      const idx = normalized.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }

    // Default column positions by common spreadsheet layouts
    // NOTE: academic_year and semester are NOT extracted from the CSV.
    // They will be provided by the frontend (from dropdown selectors) at upload time.
    const colDefaults = {
      index_number: colMap.index_number ?? 0,
      total_amount: colMap.total_amount ?? 1,
      amount_paid: colMap.amount_paid ?? 2,
    };

    // parse rows
    const parsed = rows.slice(1).map((cols) => {
      const item = {
        index_number: (cols[colDefaults.index_number] || "").toString().trim(),
        total_amount: parseFloat((cols[colDefaults.total_amount] || "0").toString().replace(/[^\d.]/g, "")) || 0,
        amount_paid: parseFloat((colDefaults.amount_paid !== undefined ? (cols[colDefaults.amount_paid] || "0") : "0").toString().replace(/[^\d.]/g, "")) || 0,
      };
      return item;
    }).filter((f) => f.index_number && f.total_amount > 0);

    if (parsed.length === 0) {
      return res.status(400).json({ error: "No valid fee records found" });
    }

    res.json({ rows: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/upload-bulk
// Accepts: { fees: [{ index_number, total_amount, amount_paid, academic_year, semester }, ...] }
// Creates fee records and payment records for multiple students with their paid amounts
exports.uploadBulk = async (req, res) => {
  try {
    const { fees } = req.body;
    if (!Array.isArray(fees) || fees.length === 0) {
      return res.status(400).json({ error: "No fee records to upload" });
    }

    const accountantId = req.user?.id;
    const created = [];
    const errors = [];

    for (let i = 0; i < fees.length; i++) {
      const { index_number, total_amount, amount_paid, academic_year, semester } = fees[i];
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
        const paid = Math.min(amount_paid || 0, total_amount);

        // Determine status
        let status = "Unpaid";
        let is_cleared = false;
        if (paid >= total_amount) {
          status = "Paid";
          is_cleared = true;
        } else if (paid > 0) {
          status = "Partial";
        }

        // Check if record already exists
        const existing = await db.query(
          "SELECT id FROM fee_records WHERE student_id = $1 AND academic_year = $2 AND semester = $3",
          [studentId, year, sem]
        );

        let feeRecordId;

        if (existing.rows.length > 0) {
          feeRecordId = existing.rows[0].id;
          // Update existing record with the new amounts
          await db.query(
            `UPDATE fee_records SET 
              total_amount = $1, 
              amount_paid = $2, 
              status = $3, 
              is_cleared = $4,
              updated_at = NOW() 
             WHERE id = $5`,
            [total_amount, paid, status, is_cleared, feeRecordId]
          );
        } else {
          // Create fee record
          const result = await db.query(
            `INSERT INTO fee_records (student_id, academic_year, semester, total_amount, amount_paid, status, is_cleared)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [studentId, year, sem, total_amount, paid, status, is_cleared]
          );
          feeRecordId = result.rows[0].id;
        }

        // Create or update payment record if amount_paid > 0
        if (paid > 0) {
          await db.query(
            `INSERT INTO payments (fee_record_id, amount, payment_method, status, verified_by, verified_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (fee_record_id) DO UPDATE SET
               amount = $2,
               status = $4,
               verified_by = $5,
               verified_at = NOW()`,
            [feeRecordId, paid, "bank_transfer", "Verified", accountantId]
          );
        }

        created.push({ index_number, id: feeRecordId, total_amount, amount_paid: paid, status });
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    res.status(201).json({ created, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
