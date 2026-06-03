const db = require("../db");

// GET /api/users — all non-student users
exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.role,
              CONCAT(u.first_name, ' ', u.last_name) AS name,
              u.first_name, u.last_name, u.phone,
              u.is_active, u.is_super_admin,
              u.created_at,
              d.name AS department
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
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
