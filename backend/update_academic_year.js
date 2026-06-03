const db = require("./src/db");

async function updateAcademicYearColumn() {
  try {
    await db.query("ALTER TABLE fee_records ALTER COLUMN academic_year TYPE VARCHAR(50)");
    console.log("✓ Updated academic_year column to VARCHAR(50)");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

updateAcademicYearColumn();
