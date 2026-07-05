const db = require("../db");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

// GET /api/users — all non-student users
exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.role,
              CONCAT(u.first_name, ' ', u.last_name) AS name,
              u.first_name, u.last_name, u.phone,
              u.is_active, u.is_super_admin,
              u.created_at,
              COALESCE(sd.name, d.name) AS department
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN supervisors sv ON sv.user_id = u.id
       LEFT JOIN departments sd ON sd.id = sv.department_id
       WHERE u.role != 'Student'
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id/toggle — activate / deactivate
exports.toggle = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id
exports.remove = async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/parse-bulk
exports.parseBulk = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { buffer } = req.file;
    if (!buffer) return res.status(400).json({ error: "File buffer is empty" });

    const isExcel = /\.(xlsx?|xls)$/i.test(req.file.originalname);
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

    const headers = rows[0];
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: "Invalid file format" });
    }

    const normalized = headers.map((h) => h ? String(h).toLowerCase().replace(/[^a-z]/g, "") : "");
    const colMap = {};
    const knownCols = {
      name: ["name", "fullname", "staffname"],
      email: ["email", "emailaddress", "mail"],
      role: ["role", "position", "jobtitle"],
      department: ["department", "dept"],
      phone: ["phone", "phonenumber", "mobile", "contact"],
    };

    for (const [field, aliases] of Object.entries(knownCols)) {
      const idx = normalized.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }

    if (Object.keys(colMap).length < 2) {
      colMap.name = 0;
      colMap.email = 1;
      colMap.role = 2;
      colMap.department = 3;
      colMap.phone = 4;
    }

    const parsed = rows.slice(1)
      .filter(cols => cols && Array.isArray(cols) && cols.length > 0)
      .map((cols) => {
        const nameIdx = colMap.name ?? 0;
        const emailIdx = colMap.email ?? 1;
        const roleIdx = colMap.role ?? 2;
        const deptIdx = colMap.department ?? 3;
        const phoneIdx = colMap.phone ?? 4;

        return {
          name: (cols[nameIdx] !== undefined && cols[nameIdx] !== null) ? String(cols[nameIdx]).trim() : "",
          email: (cols[emailIdx] !== undefined && cols[emailIdx] !== null) ? String(cols[emailIdx]).trim() : "",
          role: (cols[roleIdx] !== undefined && cols[roleIdx] !== null) ? String(cols[roleIdx]).trim() : "Supervisor",
          department: (cols[deptIdx] !== undefined && cols[deptIdx] !== null) ? String(cols[deptIdx]).trim() : "",
          phone: (cols[phoneIdx] !== undefined && cols[phoneIdx] !== null) ? String(cols[phoneIdx]).trim() : "",
        };
      })
      .filter((u) => u && u.name && u.email);

    if (parsed.length === 0) {
      return res.status(400).json({ error: "No valid user records found" });
    }

    res.json({ rows: parsed });
  } catch (err) {
    console.error('parseBulk error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/create-bulk (OPTIMIZED)
exports.createBulk = async (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "No users to create" });
    }

    const created = [];
    const errors = [];
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Pre-fetch all departments (Quick Win #4)
      const depts = await client.query("SELECT id, LOWER(name) as name FROM departments");
      const deptMap = {};
      depts.rows.forEach(d => { deptMap[d.name] = d.id; });

      // Check existing emails in bulk
      const emails = users.map(u => u.email?.trim().toLowerCase()).filter(Boolean);
      const existingResult = await client.query(
        "SELECT email FROM users WHERE email = ANY($1)",
        [emails]
      );
      const existingEmails = new Set(existingResult.rows.map(r => r.email));

      // Process users
      for (let i = 0; i < users.length; i++) {
        const { name, email, role, department, phone } = users[i];
        
        if (!name || !email) {
          errors.push(`Row ${i + 1}: Missing name or email`);
          continue;
        }

        const emailLower = email.trim().toLowerCase();
        
        if (existingEmails.has(emailLower)) {
          errors.push(`Row ${i + 1}: Email already registered`);
          continue;
        }

        const [first_name, ...rest] = name.trim().split(/\s+/);
        const last_name = rest.join(" ") || first_name;
        const defaultPwd = emailLower.split('@')[0];
        
        // Quick Win #2: No genSalt needed
        const hash = await bcrypt.hash(defaultPwd, 10);

        // Quick Win #4: Lookup department from map
        let deptId = null;
        if (department && department.trim()) {
          const deptKey = department.trim().toLowerCase();
          if (deptMap[deptKey]) {
            deptId = deptMap[deptKey];
          } else {
            const nd = await client.query(
              "INSERT INTO departments (name, is_active) VALUES ($1, TRUE) RETURNING id",
              [department.trim()]
            );
            deptId = nd.rows[0].id;
            deptMap[deptKey] = deptId;
          }
        }

        const userRole = role || "Supervisor";
        
        try {
          const userInsert = await client.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, department_id, must_change_password, last_password_change)
             VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
             RETURNING id, email, role, first_name, last_name`,
            [emailLower, hash, userRole, first_name, last_name, phone || null, deptId]
          );

          // Auto-create supervisors record for Supervisor role
          if (userRole === "Supervisor") {
            const staffId = emailLower.split("@")[0].toUpperCase();
            await client.query(
              `INSERT INTO supervisors (user_id, staff_id, department_id, is_active)
               VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING`,
              [userInsert.rows[0].id, staffId, deptId]
            );
          }

          created.push(userInsert.rows[0]);
          existingEmails.add(emailLower);
        } catch (err) {
          if (err.code === "23505") {
            errors.push(`Row ${i + 1}: User already exists`);
          } else {
            errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      }

      // Quick Win #1: Single COMMIT for all users
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
