const db = require("./src/db");

async function checkTableStructure() {
  console.log("🔍 Checking Table Structures\n");

  try {
    // Check student_supervisors table structure
    const ssColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_supervisors'
      ORDER BY ordinal_position
    `);

    console.log("📋 student_supervisors columns:");
    ssColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check if there's any data
    const ssData = await db.query("SELECT * FROM student_supervisors LIMIT 5");
    console.log(`\n📊 Rows in student_supervisors: ${ssData.rows.length}`);
    if (ssData.rows.length > 0) {
      console.log("Sample data:", ssData.rows[0]);
    }

    // Check thesis_submissions table (Supabase)
    console.log("\n\n📋 thesis_submissions should be in Supabase (not PostgreSQL main DB)");

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

checkTableStructure();
