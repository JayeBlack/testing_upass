const db = require("./src/db");

async function fixProfPerry() {
  try {
    // Get Prof Perry's user record
    const userResult = await db.query(
      "SELECT id, email, role, department_id FROM users WHERE email LIKE '%perry%'"
    );
    
    if (userResult.rows.length === 0) {
      console.log("No users found with 'perry' in email");
      return;
    }

    console.log("Found users:", userResult.rows);
    
    for (const user of userResult.rows) {

      console.log("\nProcessing user:", user);

      // Check if supervisor record exists
      const supResult = await db.query(
        "SELECT id FROM supervisors WHERE user_id = $1",
        [user.id]
      );

      if (supResult.rows.length > 0) {
        console.log("Supervisor record already exists:", supResult.rows[0]);
      } else {
        // Generate staff_id from email
        const staff_id = user.email.split('@')[0].toUpperCase();
        // Create supervisor record
        const insertResult = await db.query(
          "INSERT INTO supervisors (user_id, staff_id, department_id, is_active) VALUES ($1, $2, $3, TRUE) RETURNING *",
          [user.id, staff_id, user.department_id]
        );
        console.log("Created supervisor record:", insertResult.rows[0]);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixProfPerry();
