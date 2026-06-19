require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Manual mapping - UPDATE THESE based on what departments each user should have
const userDepartmentMapping = {
  // Format: "email": "Department Name"
  "perry@gmail.com": "Electrical Engineering",
  "bel@gmail.com": "Mathematical Sciences",
  "obo@gmail.com": "Petroleum Engineering",
  "test_s@gmail.com": "Environmental and Safety Engineering",
  // Add more mappings as needed
  // "dean@gmail.com": "School of Postgraduate Studies",
};

async function updateExistingUsers() {
  const client = await pool.connect();
  try {
    console.log("\n" + "=".repeat(60));
    console.log("UPDATING EXISTING USERS WITH DEPARTMENTS");
    console.log("=".repeat(60) + "\n");

    await client.query("BEGIN");

    let updated = 0;
    let failed = 0;

    for (const [email, deptName] of Object.entries(userDepartmentMapping)) {
      try {
        // Get department_id
        const deptResult = await client.query(
          "SELECT id FROM departments WHERE LOWER(name) = LOWER($1)",
          [deptName]
        );

        if (deptResult.rows.length === 0) {
          console.log(`❌ ${email}: Department "${deptName}" not found`);
          failed++;
          continue;
        }

        const department_id = deptResult.rows[0].id;

        // Update user
        const userResult = await client.query(
          `UPDATE users 
           SET department_id = $1, updated_at = NOW() 
           WHERE email = $2 
           RETURNING id, email, role`,
          [department_id, email]
        );

        if (userResult.rows.length === 0) {
          console.log(`❌ ${email}: User not found`);
          failed++;
          continue;
        }

        const user = userResult.rows[0];

        // If supervisor, also update supervisors table
        if (user.role === "Supervisor") {
          await client.query(
            `UPDATE supervisors 
             SET department_id = $1 
             WHERE user_id = $2`,
            [department_id, user.id]
          );
          console.log(`✅ ${email} → ${deptName} (users + supervisors table)`);
        } else {
          console.log(`✅ ${email} → ${deptName}`);
        }

        updated++;
      } catch (err) {
        console.log(`❌ ${email}: Error - ${err.message}`);
        failed++;
      }
    }

    await client.query("COMMIT");

    console.log("\n" + "=".repeat(60));
    console.log("RESULTS:");
    console.log("=".repeat(60));
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("");

    if (updated > 0) {
      console.log("✅ Run verify_departments.js again to see the changes!");
    }

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Transaction failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log(`
NOTE: This script will update existing users based on the mapping defined in the code.
Edit the 'userDepartmentMapping' object at the top of this file to set departments.

Current mappings:
`);

Object.entries(userDepartmentMapping).forEach(([email, dept]) => {
  console.log(`  - ${email} → ${dept}`);
});

console.log("\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n");

setTimeout(updateExistingUsers, 3000);
