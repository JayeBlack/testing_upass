const db = require("../db");

/**
 * Log user activity to audit_logs table
 */
async function logActivity(userId, action, entity = null, entityId = null, details = null, ipAddress = null) {
  try {
    const userResult = await db.query(
      "SELECT first_name, last_name, role FROM users WHERE id = $1",
      [userId]
    );
    
    if (userResult.rows.length === 0) return;
    
    const user = userResult.rows[0];
    const actorName = `${user.first_name} ${user.last_name}`;
    
    await db.query(
      `INSERT INTO audit_logs (user_id, actor_name, actor_role, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        actorName,
        user.role,
        action,
        entity,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress || null
      ]
    );
  } catch (err) {
    console.error('[Activity Log] Error:', err.message);
  }
}

module.exports = { logActivity };