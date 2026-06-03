const db = require("./src/db");

async function debugProfPerry() {
  try {
    // Get Prof Perry's user record
    const userResult = await db.query(
      "SELECT id, email, role FROM users WHERE email LIKE '%perry%'"
    );
    console.log("User record:", userResult.rows);

    if (userResult.rows.length === 0) return;
    const userId = userResult.rows[0].id;

    // Get supervisor record
    const supResult = await db.query(
      "SELECT * FROM supervisors WHERE user_id = $1",
      [userId]
    );
    console.log("\nSupervisor record:", supResult.rows);

    if (supResult.rows.length === 0) return;
    const supervisorId = supResult.rows[0].id;

    // Get assignments
    const assignResult = await db.query(
      "SELECT * FROM student_supervisors WHERE supervisor_id = $1",
      [supervisorId]
    );
    console.log("\nAssignments:", assignResult.rows);

    // Get students with full details
    const studentsResult = await db.query(
      `SELECT s.id, 
              CONCAT(u.first_name, ' ', u.last_name) AS name,
              s.index_number,
              p.name AS program_name,
              d.name AS department_name
       FROM student_supervisors ss
       JOIN students s ON ss.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE ss.supervisor_id = $1`,
      [supervisorId]
    );
    console.log("\nFull student details:", studentsResult.rows);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

debugProfPerry();
