const db = require("../db");

// GET /api/departments - Get all active departments
exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM departments WHERE is_active = TRUE ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
