const db = require("../db");

// GET /api/programs - Get all active programs with department info
exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.code, p.department_id, d.name as department_name 
       FROM programs p
       LEFT JOIN departments d ON p.department_id = d.id
       WHERE p.is_active = TRUE 
       ORDER BY p.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
