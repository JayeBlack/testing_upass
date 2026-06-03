const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, phone, department_id, is_super_admin, must_change_password } = req.body;
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, department_id, is_super_admin, must_change_password, last_password_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, FALSE), COALESCE($9, TRUE), NOW())
       RETURNING id, email, role, first_name, last_name, phone, avatar_url, department_id, is_super_admin, must_change_password, created_at`,
      [email, password_hash, role, first_name, last_name, phone, department_id || null, is_super_admin, must_change_password]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const result = await db.query("SELECT * FROM users WHERE email = $1 AND is_active = TRUE", [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        department_id: user.department_id || null,
        is_super_admin: !!user.is_super_admin,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Fetch role-specific profile data
    let profile = {};
    if (user.role === "Student") {
      const s = await db.query(
        `SELECT s.*, p.name as program_name, d.name as department_name
         FROM students s
         LEFT JOIN programs p ON s.program_id = p.id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [user.id]
      );
      if (s.rows.length > 0) profile = s.rows[0];
    } else if (user.role === "Supervisor") {
      const s = await db.query(
        `SELECT s.*, d.name as department_name
         FROM supervisors s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [user.id]
      );
      if (s.rows.length > 0) profile = s.rows[0];
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        department_id: user.department_id || null,
        is_super_admin: !!user.is_super_admin,
        must_change_password: !!user.must_change_password,
        ...profile,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, email, role, first_name, last_name, phone, avatar_url, department_id, is_super_admin, must_change_password FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const u = result.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      role: u.role,
      name: `${u.first_name} ${u.last_name}`,
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      avatar_url: u.avatar_url,
      department_id: u.department_id,
      is_super_admin: !!u.is_super_admin,
      must_change_password: !!u.must_change_password,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/change-password  (authenticated)
exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    const r = await db.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "User not found" });
    if (old_password) {
      const ok = await bcrypt.compare(old_password, r.rows[0].password_hash);
      if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(new_password, salt);
    await db.query(
      "UPDATE users SET password_hash = $1, must_change_password = FALSE, last_password_change = NOW(), updated_at = NOW() WHERE id = $2",
      [hash, req.user.id]
    );
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/admin/reset-password  (super-admin only)
// body: { user_id }  → resets to student's index number, or staff email local-part
exports.adminResetPassword = async (req, res) => {
  try {
    if (!req.user?.is_super_admin) {
      return res.status(403).json({ error: "Super-admin only" });
    }
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    const u = await db.query("SELECT id, email, role FROM users WHERE id = $1", [user_id]);
    if (u.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const target = u.rows[0];

    let defaultPwd;
    if (target.role === "Student") {
      const s = await db.query("SELECT index_number FROM students WHERE user_id = $1", [user_id]);
      defaultPwd = s.rows[0]?.index_number || target.email.split("@")[0];
    } else {
      defaultPwd = target.email.split("@")[0];
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPwd, salt);
    await db.query(
      "UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2",
      [hash, user_id]
    );
    res.json({ message: "Password reset", default_password: defaultPwd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/admin/create-staff  (super-admin only)
// Creates a non-student user with default password = email local-part.
exports.adminCreateStaff = async (req, res) => {
  try {
    if (!req.user?.is_super_admin) {
      return res.status(403).json({ error: "Super-admin only" });
    }
    const { email, first_name, last_name, role, phone, department_id, is_super_admin } = req.body;
    if (!email || !first_name || !last_name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (role === "Student") {
      return res.status(400).json({ error: "Use student enrollment for students" });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

    const defaultPwd = email.split("@")[0];
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultPwd, salt);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, department_id, is_super_admin, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, FALSE), TRUE)
       RETURNING id, email, role, first_name, last_name, phone, department_id, is_super_admin, must_change_password, created_at`,
      [email, hash, role, first_name, last_name, phone || null, department_id || null, is_super_admin]
    );

    // Create supervisor record if role is Supervisor
    if (role === "Supervisor") {
      const staff_id = email.split('@')[0].toUpperCase();
      await db.query(
        "INSERT INTO supervisors (user_id, staff_id, department_id, is_active) VALUES ($1, $2, $3, TRUE)",
        [result.rows[0].id, staff_id, department_id || null]
      );
    }

    res.status(201).json({ user: result.rows[0], default_password: defaultPwd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
