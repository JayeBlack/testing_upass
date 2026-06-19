require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEPARTMENTS_TO_ADD = [
  "Computer Science",
  "Mining Engineering",
  "Mechanical Engineering",
  "Geomatic Engineering",
  "Finance Office",
  "School of Postgraduate Studies"
];

async function addMissingDepartments() {
  const client = await pool.connect();
  try {
    console.log("\n" + "=".repeat(60));
    console.log("ADDING MISSING DEPARTMENTS");
    console.log("=".repeat(60) + "\n");

    await client.query("BEGIN");

    let added = 0;
    let skipped = 0;

    for (const deptName of DEPARTMENTS_TO_ADD) {
      // Check if exists
      const existing = await client.query(
        "SELECT id FROM departments WHERE LOWER(name) = LOWER($1)",
        [deptName]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  ${deptName} - Already exists`);
        skipped++;
      } else {
        await client.query(
          "INSERT INTO departments (name, is_active) VALUES ($1, TRUE)",
          [deptName]
        );
        console.log(`✅ ${deptName} - Added`);
        added++;
      }
    }

    await client.query("COMMIT");

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Added: ${added} departments`);
    console.log(`⏭️  Skipped: ${skipped} (already existed)`);
    console.log("=".repeat(60));

    // Show all departments
    console.log("\n📋 ALL DEPARTMENTS IN DATABASE:\n");
    const all = await client.query("SELECT id, name FROM departments ORDER BY name");
    all.rows.forEach(d => {
      console.log(`   [${d.id}] ${d.name}`);
    });
    console.log("");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingDepartments();
