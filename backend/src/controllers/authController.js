const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, phone, department_id, is_super_admin } = req.body;
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, department_id, is_super_admin, must_change_password, last_password_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, FALSE), TRUE, NOW())
       RETURNING id, email, role, first_name, last_name, phone, avatar_url, department_id, is_super_admin, must_change_password, created_at`,
      [email, password_hash, role, first_name, last_name, phone, department_id || null, is_super_admin]
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

    // Build base user object
    const userResponse = {
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
    };

    // Fetch role-specific profile data
    if (user.role === "Student") {
      const s = await db.query(
        `SELECT s.index_number, s.program_id, s.department_id, s.admission_cycle, 
                p.name as program_name, d.name as department_name
         FROM students s
         LEFT JOIN programs p ON s.program_id = p.id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [user.id]
      );
      if (s.rows.length > 0) {
        const studentData = s.rows[0];
        // Map database fields to frontend expected fields
        userResponse.index_number = studentData.index_number;
        userResponse.program_id = studentData.program_id;
        userResponse.department_id = studentData.department_id;
        userResponse.program_name = studentData.program_name; // Keep for table display
        userResponse.department_name = studentData.department_name; // Keep for table display
        userResponse.program = studentData.program_name; // Frontend expects 'program'
        userResponse.department = studentData.department_name; // Frontend expects 'department'
        userResponse.admission_cycle = studentData.admission_cycle;
      }
    } else if (user.role === "Supervisor") {
      const s = await db.query(
        `SELECT s.staff_id, s.department_id, d.name as department_name
         FROM supervisors s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [user.id]
      );
      if (s.rows.length > 0) {
        const supervisorData = s.rows[0];
        userResponse.staff_id = supervisorData.staff_id;
        userResponse.department_id = supervisorData.department_id;
        userResponse.department_name = supervisorData.department_name;
        userResponse.department = supervisorData.department_name;
      }
    } else if (user.department_id) {
      // For other staff roles with departments (Admin, Registrar, etc.)
      const d = await db.query(
        "SELECT name FROM departments WHERE id = $1",
        [user.department_id]
      );
      if (d.rows.length > 0) {
        userResponse.department = d.rows[0].name;
        userResponse.department_name = d.rows[0].name;
      }
    }

    res.json({ token, user: userResponse });
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

    // Build base user object
    const userResponse = {
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
    };

    // Fetch role-specific profile data (same as login)
    if (u.role === "Student") {
      const s = await db.query(
        `SELECT s.index_number, s.program_id, s.department_id, s.admission_cycle, 
                p.name as program_name, d.name as department_name
         FROM students s
         LEFT JOIN programs p ON s.program_id = p.id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [u.id]
      );
      if (s.rows.length > 0) {
        const studentData = s.rows[0];
        userResponse.index_number = studentData.index_number;
        userResponse.program_id = studentData.program_id;
        userResponse.department_id = studentData.department_id;
        userResponse.program_name = studentData.program_name;
        userResponse.department_name = studentData.department_name;
        userResponse.program = studentData.program_name; // Frontend expects 'program'
        userResponse.department = studentData.department_name; // Frontend expects 'department'
        userResponse.admission_cycle = studentData.admission_cycle;
      }
    } else if (u.role === "Supervisor") {
      const s = await db.query(
        `SELECT s.staff_id, s.department_id, d.name as department_name
         FROM supervisors s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.user_id = $1`,
        [u.id]
      );
      if (s.rows.length > 0) {
        const supervisorData = s.rows[0];
        userResponse.staff_id = supervisorData.staff_id;
        userResponse.department_id = supervisorData.department_id;
        userResponse.department_name = supervisorData.department_name;
        userResponse.department = supervisorData.department_name;
      }
    } else if (u.department_id) {
      // For other staff roles with departments (Admin, Registrar, etc.)
      const d = await db.query(
        "SELECT name FROM departments WHERE id = $1",
        [u.department_id]
      );
      if (d.rows.length > 0) {
        userResponse.department = d.rows[0].name;
        userResponse.department_name = d.rows[0].name;
      }
    }

    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/upload-avatar  (authenticated)
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Fetch old avatar before updating
    const old = await db.query("SELECT avatar_url FROM users WHERE id = $1", [req.user.id]);
    const oldUrl = old.rows[0]?.avatar_url;

    const avatarUrl = `/uploads/general/${req.file.filename}`;
    await db.query("UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2", [avatarUrl, req.user.id]);

    // Delete old file if it was in uploads/general
    if (oldUrl && oldUrl.startsWith("/uploads/general/")) {
      const oldPath = path.join(__dirname, "../../..", oldUrl);
      fs.unlink(oldPath, () => {});
    }

    res.json({ avatar_url: avatarUrl });
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
    const hash = await bcrypt.hash(new_password, 10);
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
    console.log('=== ADMIN RESET PASSWORD DEBUG ===');
    console.log('Request user:', req.user);
    console.log('Is super admin?', req.user?.is_super_admin);
    console.log('Request body:', req.body);
    
    if (!req.user?.is_super_admin) {
      console.log('ERROR: User is not super admin');
      return res.status(403).json({ error: "Super-admin only" });
    }
    const { user_id } = req.body;
    console.log('Received user_id:', user_id, 'Type:', typeof user_id);
    
    if (!user_id) {
      console.log('ERROR: No user_id provided');
      return res.status(400).json({ error: "user_id required" });
    }

    const u = await db.query("SELECT id, email, role FROM users WHERE id = $1", [user_id]);
    console.log('User query result:', u.rows);
    
    if (u.rows.length === 0) {
      console.log('ERROR: User not found with id:', user_id);
      return res.status(404).json({ error: "User not found" });
    }
    const target = u.rows[0];
    console.log('Target user:', target);

    let defaultPwd;
    if (target.role === "Student") {
      const s = await db.query("SELECT index_number FROM students WHERE user_id = $1", [user_id]);
      defaultPwd = s.rows[0]?.index_number || target.email.split("@")[0];
      console.log('Student password (index or email prefix):', defaultPwd);
    } else {
      defaultPwd = target.email.split("@")[0];
      console.log('Staff password (email prefix):', defaultPwd);
    }

    const hash = await bcrypt.hash(defaultPwd, 10);
    
    console.log('Updating password for user_id:', user_id);
    await db.query(
      "UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2",
      [hash, user_id]
    );
    
    console.log('Password reset successful');
    console.log('=== END RESET PASSWORD DEBUG ===\n');
    
    res.json({ message: "Password reset", default_password: defaultPwd });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/admin/set-password  (super-admin only)
// body: { user_id, new_password }  → sets custom password for any user
exports.adminSetPassword = async (req, res) => {
  try {
    if (!req.user?.is_super_admin) {
      return res.status(403).json({ error: "Super-admin only" });
    }
    const { user_id, new_password } = req.body;
    
    if (!user_id || !new_password) {
      return res.status(400).json({ error: "user_id and new_password required" });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const u = await db.query("SELECT id, email FROM users WHERE id = $1", [user_id]);
    if (u.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const hash = await bcrypt.hash(new_password, 10);
    
    await db.query(
      "UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2",
      [hash, user_id]
    );
    
    res.json({ message: "Password updated successfully" });
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
    const { email, first_name, last_name, role, phone, department, is_super_admin, title, staff_id, specialization } = req.body;
    
    // DEBUG: Log what we received
    console.log('=== CREATE STAFF DEBUG ===');
    console.log('Received department:', department);
    console.log('Received role:', role);
    console.log('Full body:', JSON.stringify(req.body, null, 2));
    
    if (!email || !first_name || !last_name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (role === "Student") {
      return res.status(400).json({ error: "Use student enrollment for students" });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

    // Convert department name to department_id
    let department_id = null;
    if (department) {
      console.log('Querying for department:', department);
      const deptResult = await db.query(
        "SELECT id FROM departments WHERE LOWER(name) = LOWER($1)",
        [department]
      );
      console.log('Department query result:', deptResult.rows);
      if (deptResult.rows.length > 0) {
        department_id = deptResult.rows[0].id;
        console.log('Found department_id:', department_id);
      } else {
        console.log('WARNING: Department not found in database:', department);
      }
    } else {
      console.log('WARNING: No department provided in request');
    }

    const defaultPwd = email.split("@")[0];
    const hash = await bcrypt.hash(defaultPwd, 10);

    console.log('Inserting user with department_id:', department_id);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, department_id, is_super_admin, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, FALSE), TRUE)
       RETURNING id, email, role, first_name, last_name, phone, department_id, is_super_admin, must_change_password, created_at`,
      [email, hash, role, first_name, last_name, phone || null, department_id, is_super_admin]
    );
    console.log('User created with department_id:', result.rows[0].department_id);

    // Create supervisor record if role is Supervisor
    if (role === "Supervisor") {
      const supervisor_staff_id = staff_id || email.split('@')[0].toUpperCase();
      const supervisor_title = title || "Dr.";
      console.log('Creating supervisor record with department_id:', department_id);
      await db.query(
        "INSERT INTO supervisors (user_id, staff_id, title, department_id, specialization, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)",
        [result.rows[0].id, supervisor_staff_id, supervisor_title, department_id, specialization || null]
      );
      console.log('Supervisor record created');
    }
    
    console.log('=== END CREATE STAFF DEBUG ===\n');

    res.status(201).json({ user: result.rows[0], default_password: defaultPwd });
  } catch (err) {
    console.error('CREATE STAFF ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};
