const db = require("../db");
const XLSX = require("xlsx");
const { createNotification } = require("./notificationController");

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
    const { department, status, search, page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
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
      sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${idx} OR s.index_number ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    
    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS count_query`;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].total);
    
    sql += " ORDER BY u.last_name";
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limitNum, offset);
    
    const result = await db.query(sql, params);
    console.log(`[Get All Fees] Found ${result.rows.length} fee records (page ${pageNum} of ${Math.ceil(total / limitNum)})`);
    
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
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

    // Update fee record — cap amount_paid at total_amount, store overflow as credit_balance
    await db.query(
      `UPDATE fee_records SET
        amount_paid = LEAST(amount_paid + $1, total_amount),
        credit_balance = GREATEST((amount_paid + $1) - total_amount, 0),
        updated_at = NOW()
       WHERE id = $2`,
      [amount, fee_record_id]
    );

    // Auto-update status
    const updated = await db.query(
      `UPDATE fee_records SET
        status = CASE WHEN amount_paid >= total_amount THEN 'Paid' ELSE 'Partial' END,
        is_cleared = (amount_paid >= total_amount),
        outstanding = total_amount - amount_paid
       WHERE id = $1 RETURNING student_id, status, academic_year, semester, amount_paid, total_amount`,
      [fee_record_id]
    );
    if (updated.rows.length > 0) {
      const fee = updated.rows[0];
      const studentUser = await db.query('SELECT user_id FROM students WHERE id = $1', [fee.student_id]);
      if (studentUser.rows.length > 0) {
        const isPaid = fee.status === 'Paid';
        await createNotification(
          studentUser.rows[0].user_id, 'fee',
          isPaid ? 'Fees Fully Paid' : 'Payment Received',
          isPaid
            ? `Your fees for ${fee.academic_year} ${fee.semester} are fully paid.`
            : `Payment of GHS ${parseFloat(fee.amount_paid).toLocaleString()} received for ${fee.academic_year} ${fee.semester}. Outstanding: GHS ${(fee.total_amount - fee.amount_paid).toLocaleString()}.`,
          isPaid ? 'success' : 'info'
        );
      }
    }
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

// GET /api/fees/filter-options — distinct academic years and departments that have fee records
exports.getFilterOptions = async (req, res) => {
  try {
    const [yearsResult, deptsResult] = await Promise.all([
      db.query(`
        SELECT DISTINCT f.academic_year
        FROM fee_records f
        ORDER BY f.academic_year DESC
      `),
      db.query(`
        SELECT DISTINCT d.name AS department
        FROM fee_records f
        JOIN students s ON f.student_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE d.name IS NOT NULL
        ORDER BY d.name
      `),
    ]);
    res.json({
      academicYears: yearsResult.rows.map((r) => r.academic_year),
      departments: deptsResult.rows.map((r) => r.department),
    });
  } catch (err) {
    console.error(`[Fee Filter Options] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/fees/charts (chart data for analytics)
exports.getCharts = async (req, res) => {
  try {
    const { academic_year, department } = req.query;
    console.log(`[Fee Charts] Filters - academic_year: ${academic_year}, department: ${department}`);

    const baseJoin = `
      FROM fee_records f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    let whereClause = "";
    if (academic_year) { whereClause += ` AND f.academic_year = $${idx++}`; params.push(academic_year); }
    if (department) { whereClause += ` AND d.name = $${idx++}`; params.push(department); }

    // 1. By Department
    const deptSql = `
      SELECT
        COALESCE(d.name, 'Unknown') AS label,
        COALESCE(SUM(f.amount_paid), 0)::NUMERIC AS collected,
        COALESCE(SUM(GREATEST(f.total_amount - f.amount_paid, 0)), 0)::NUMERIC AS outstanding,
        COALESCE(SUM(f.total_amount), 0)::NUMERIC AS total
      ${baseJoin} ${whereClause}
      GROUP BY d.name
      ORDER BY total DESC
      LIMIT 10
    `;

    // 2. By Academic Year
    const yearSql = `
      SELECT
        f.academic_year AS label,
        COALESCE(SUM(f.amount_paid), 0)::NUMERIC AS collected,
        COALESCE(SUM(GREATEST(f.total_amount - f.amount_paid, 0)), 0)::NUMERIC AS outstanding,
        COALESCE(SUM(f.total_amount), 0)::NUMERIC AS total
      ${baseJoin} ${whereClause}
      GROUP BY f.academic_year
      ORDER BY f.academic_year
    `;

    // 3. By Semester
    const semSql = `
      SELECT
        f.semester AS label,
        COALESCE(SUM(f.amount_paid), 0)::NUMERIC AS collected,
        COALESCE(SUM(GREATEST(f.total_amount - f.amount_paid, 0)), 0)::NUMERIC AS outstanding,
        COALESCE(SUM(f.total_amount), 0)::NUMERIC AS total,
        COUNT(*) FILTER (WHERE f.status = 'Paid')::INTEGER AS paid_count,
        COUNT(*) FILTER (WHERE f.status = 'Partial')::INTEGER AS partial_count,
        COUNT(*) FILTER (WHERE f.status = 'Unpaid' OR f.status = 'Pending')::INTEGER AS unpaid_count
      ${baseJoin} ${whereClause}
      GROUP BY f.semester
      ORDER BY f.semester
    `;

    // 4. Payment status breakdown
    const statusSql = `
      SELECT
        CASE
          WHEN f.status = 'Paid' THEN 'Paid'
          WHEN f.status = 'Partial' THEN 'Partial'
          ELSE 'Unpaid'
        END AS label,
        COUNT(*)::INTEGER AS count,
        COALESCE(SUM(f.total_amount), 0)::NUMERIC AS total_amount
      ${baseJoin} ${whereClause}
      GROUP BY label
      ORDER BY label
    `;

    const [deptResult, yearResult, semResult, statusResult] = await Promise.all([
      db.query(deptSql, params),
      db.query(yearSql, params),
      db.query(semSql, params),
      db.query(statusSql, params),
    ]);

    const toNum = (v) => parseFloat(v) || 0;

    res.json({
      byDepartment: deptResult.rows.map(r => ({
        label: r.label,
        collected: toNum(r.collected),
        outstanding: toNum(r.outstanding),
        total: toNum(r.total),
      })),
      byYear: yearResult.rows.map(r => ({
        label: r.label,
        collected: toNum(r.collected),
        outstanding: toNum(r.outstanding),
        total: toNum(r.total),
      })),
      bySemester: semResult.rows.map(r => ({
        label: r.label,
        collected: toNum(r.collected),
        outstanding: toNum(r.outstanding),
        total: toNum(r.total),
        paid_count: r.paid_count,
        partial_count: r.partial_count,
        unpaid_count: r.unpaid_count,
      })),
      byStatus: statusResult.rows.map(r => ({
        label: r.label,
        count: r.count,
        total_amount: toNum(r.total_amount),
      })),
    });
  } catch (err) {
    console.error(`[Fee Charts] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/save-schedule
// Saves the original Excel file directly without modification
exports.saveSchedule = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fs = require("fs");
    const path = require("path");
    const uploadDir = path.join(__dirname, "..", "..", "uploads", "fee-schedules");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const originalName = req.file.originalname || "fee-schedule";
    const ext = path.extname(originalName) || ".xlsx";
    const uniqueName = `fee-schedule-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const destPath = path.join(uploadDir, uniqueName);
    
    // Save the original file buffer directly - no parsing or regeneration
    const buffer = Buffer.from(req.file.buffer);
    fs.writeFileSync(destPath, buffer);

    const downloadUrl = `/uploads/fee-schedules/${uniqueName}`;
    res.status(201).json({ downloadUrl, fileName: uniqueName });
  } catch (err) {
    console.error(`[Fee Save Schedule] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/fees/parse-fee-schedule
// Accepts multipart file (XLSX) — fee schedule with Programme, Level, Amount columns
exports.parseFeeSchedule = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const isExcel = /\.(xlsx?|xls)$/i.test(req.file.originalname || req.file.mimetype);
    let rows = [];

    if (isExcel) {
      const XLSX = require("xlsx");
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (data.length < 2) return res.status(400).json({ error: "File must contain header and at least one row" });

      const headers = data[0].map((h) => String(h).toLowerCase().replace(/[^a-z]/g, ""));
      const progIdx = headers.findIndex((h) => h.includes("programme") || h.includes("program"));
      const levelIdx = headers.findIndex((h) => h.includes("level") || h.includes("year"));
      const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("fee") || h.includes("total"));

      rows = data.slice(1)
        .filter((row) => row.some((c) => String(c).trim()))
        .map((row) => ({
          programme: String(row[progIdx >= 0 ? progIdx : 0] || "").trim(),
          level: String(row[levelIdx >= 0 ? levelIdx : 1] || "").trim(),
          amount: String(row[amountIdx >= 0 ? amountIdx : 2] || "").trim(),
        }))
        .filter((r) => r.programme && r.amount);
    } else {
      // CSV — parse from buffer text
      const text = req.file.buffer.toString("utf-8");
      const lines = text.trim().split("\n");
      if (lines.length < 2) return res.status(400).json({ error: "File must contain header and at least one row" });

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const progIdx = headers.findIndex((h) => h.includes("programme") || h.includes("program"));
      const levelIdx = headers.findIndex((h) => h.includes("level") || h.includes("year"));
      const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("fee") || h.includes("total"));

      rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
        return {
          programme: cols[progIdx >= 0 ? progIdx : 0] || "",
          level: cols[levelIdx >= 0 ? levelIdx : 1] || "",
          amount: cols[amountIdx >= 0 ? amountIdx : 2] || "",
        };
      }).filter((r) => r.programme && r.amount);
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: "No valid fee schedule records found. Ensure columns include Programme, Level, and Amount." });
    }

    res.json({ rows });
  } catch (err) {
    console.error(`[Fee Parse Schedule] Error:`, err.message);
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
      student_name: ["name", "studentname", "student", "fullname"],
      total_amount: ["amount", "totalamount", "fee", "fees", "totalfee", "totalfees"],
      amount_paid: ["amountpaid", "paid", "payamount", "paymentamount", "paidamount"],
      academic_year: ["year", "academicyear", "session"],
      semester: ["semester", "sem", "term"],
    };
    for (const [field, aliases] of Object.entries(knownCols)) {
      const idx = normalized.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }

    // Default column positions by common spreadsheet layout
    const colDefaults = {
      index_number: colMap.index_number ?? 0,
      student_name: colMap.student_name ?? 1,
      total_amount: colMap.total_amount ?? 2,
      amount_paid: colMap.amount_paid ?? 3,
      academic_year: colMap.academic_year ?? 4,
      semester: colMap.semester ?? 5,
    };

    // parse rows
    const parsed = rows.slice(1).map((cols) => {
      const item = {
        index_number: (cols[colDefaults.index_number] || "").toString().trim(),
        student_name: colDefaults.student_name !== undefined ? (cols[colDefaults.student_name] || "").toString().trim() : "",
        total_amount: parseFloat((cols[colDefaults.total_amount] || "0").toString().replace(/[^\d.]/g, "")) || 0,
        amount_paid: parseFloat((colDefaults.amount_paid !== undefined ? (cols[colDefaults.amount_paid] || "0") : "0").toString().replace(/[^\d.]/g, "")) || 0,
        academic_year: (cols[colDefaults.academic_year] || "").toString().trim(),
        semester: (cols[colDefaults.semester] || "").toString().trim(),
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

// POST /api/fees/upload-bulk (OPTIMIZED)
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
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Quick Win #4: Pre-fetch all students by index number
      const indexes = fees.map(f => f.index_number).filter(Boolean);
      const studentsResult = await client.query(
        "SELECT id, index_number FROM students WHERE index_number = ANY($1)",
        [indexes]
      );
      const studentMap = {};
      studentsResult.rows.forEach(s => { studentMap[s.index_number] = s.id; });

      // Quick Win #4: Pre-fetch existing fee records
      const existingFeesResult = await client.query(
        `SELECT student_id, academic_year, semester, id, amount_paid, total_amount
         FROM fee_records
         WHERE student_id = ANY($1)`,
        [Object.values(studentMap)]
      );
      const feeRecordMap = {};
      existingFeesResult.rows.forEach(f => {
        const key = `${f.student_id}_${f.academic_year}_${f.semester}`;
        feeRecordMap[key] = f;
      });

      // Process fees
      for (let i = 0; i < fees.length; i++) {
        const { index_number, total_amount, amount_paid, academic_year, semester } = fees[i];
        
        if (!index_number || !total_amount) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        const studentId = studentMap[index_number];
        if (!studentId) {
          errors.push(`Row ${i + 1}: Student with index ${index_number} not found`);
          continue;
        }

        try {
          const year = academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
          const sem = semester || "First";
          const rawPaid = amount_paid || 0;
          const credit_balance = rawPaid > total_amount ? rawPaid - total_amount : 0;

          // Determine status
          let status = "Unpaid";
          let is_cleared = false;
          if (rawPaid >= total_amount) {
            status = "Paid";
            is_cleared = true;
          } else if (rawPaid > 0) {
            status = "Partial";
          }

          const key = `${studentId}_${year}_${sem}`;
          const existing = feeRecordMap[key];
          let feeRecordId;

          if (existing) {
            feeRecordId = existing.id;
            // Update existing record - DO NOT change total_amount, only add payment
            const updatedRecord = await client.query(
              `UPDATE fee_records SET
                amount_paid = amount_paid + $1,
                credit_balance = GREATEST((amount_paid + $1) - total_amount, 0),
                updated_at = NOW()
               WHERE id = $2
               RETURNING amount_paid, total_amount, credit_balance`,
              [rawPaid, feeRecordId]
            );
            const newPaid = parseFloat(updatedRecord.rows[0].amount_paid);
            const newTotal = parseFloat(updatedRecord.rows[0].total_amount);
            const newCredit = parseFloat(updatedRecord.rows[0].credit_balance);
            const newStatus = newPaid >= newTotal ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid";
            const newCleared = newPaid >= newTotal;
            
            await client.query(
              `UPDATE fee_records SET status = $1, is_cleared = $2 WHERE id = $3`,
              [newStatus, newCleared, feeRecordId]
            );
            
            if (rawPaid > 0) {
              await client.query(
                `INSERT INTO payments (fee_record_id, amount, payment_method, status, verified_by, verified_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [feeRecordId, rawPaid, "bank_transfer", "Verified", accountantId]
              );
            }
            created.push({ index_number, id: feeRecordId, total_amount: newTotal, amount_paid: newPaid, credit_balance: newCredit, status: newStatus });
          } else {
            // Create new fee record
            const result = await client.query(
              `INSERT INTO fee_records (student_id, academic_year, semester, total_amount, amount_paid, credit_balance, status, is_cleared)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING id`,
              [studentId, year, sem, total_amount, rawPaid, credit_balance, status, is_cleared]
            );
            feeRecordId = result.rows[0].id;
            
            if (rawPaid > 0) {
              await client.query(
                `INSERT INTO payments (fee_record_id, amount, payment_method, status, verified_by, verified_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [feeRecordId, rawPaid, "bank_transfer", "Verified", accountantId]
              );
            }
            created.push({ index_number, id: feeRecordId, total_amount, amount_paid: rawPaid, credit_balance, status });
            
            // Update map for subsequent records
            feeRecordMap[key] = { id: feeRecordId, student_id: studentId, academic_year: year, semester: sem };
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      // Quick Win #1: Single COMMIT
      await client.query("COMMIT");
      res.status(201).json({ created, errors: errors.length > 0 ? errors : undefined });
      
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
