/**
 * Database migration runner
 * Usage: node src/db/migrate.js
 *
 * Runs all SQL migration files in order from src/db/migrations/
 */
const fs = require("fs");
const path = require("path");
const db = require("./index");

async function migrate() {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  console.log(`Found ${files.length} migration(s)...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`▶ Running ${file}...`);
    try {
      await db.query(sql);
      console.log(`  ✓ ${file} applied successfully`);
      successCount++;
    } catch (err) {
      // Check if error is because object already exists
      if (err.message.includes("already exists") || err.message.includes("does not exist")) {
        console.log(`  ⚠ ${file} skipped: ${err.message}`);
      } else {
        console.error(`  ✗ ${file} failed:`, err.message);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ⚠ Skipped: ${files.length - successCount - errorCount}`);
  console.log(`   ✗ Failed: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log("\n✅ All migrations completed!");
  } else {
    console.log("\n⚠️  Some migrations failed. Check errors above.");
  }
  
  process.exit(errorCount > 0 ? 1 : 0);
}

migrate();
