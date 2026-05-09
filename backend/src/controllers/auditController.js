const db = require("../db");

// GET /api/audit-logs?action=&from=&to=&search=
exports.getAll = async (req, res) => {
  try {
    const { action, from, to, search, limit = 200 } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    let i = 1;
    if (action) { sql += ` AND action = $${i++}`; params.push(action); }
    if (from)   { sql += ` AND created_at >= $${i++}`; params.push(from); }
    if (to)     { sql += ` AND created_at <= $${i++}`; params.push(to); }
    if (search) {
      sql += ` AND (actor_name ILIKE $${i} OR entity ILIKE $${i} OR action ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }
    sql += ` ORDER BY created_at DESC LIMIT $${i}`;
    params.push(Number(limit));
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/audit-logs
exports.create = async (req, res) => {
  try {
    const { action, entity, entity_id, details } = req.body;
    if (!action) return res.status(400).json({ error: "action is required" });
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const u = await db.query(
      "SELECT first_name, last_name, role FROM users WHERE id = $1",
      [req.user.id]
    );
    const actor = u.rows[0] || {};
    const result = await db.query(
      `INSERT INTO audit_logs (user_id, actor_name, actor_role, action, entity, entity_id, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id,
        actor.first_name ? `${actor.first_name} ${actor.last_name}` : null,
        actor.role || null,
        action,
        entity || null,
        entity_id ? String(entity_id) : null,
        details ? JSON.stringify(details) : null,
        ip,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};