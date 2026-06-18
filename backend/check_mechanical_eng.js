require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkMechanicalEngineering() {
  try {
    console.log("\nChecking for 'Mechanical Engineering' in departments table...\n");
    
    const result = await pool.query(
      "SELECT id, name FROM departments WHERE LOWER(name) = LOWER($1)",
      ["Mechanical Engineering"]
    );
    
    if (result.rows.length > 0) {
      console.log("✅ FOUND:");
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Name: ${result.rows[0].name}`);
    } else {
      console.log("❌ NOT FOUND in database!");
      console.log("\nAvailable departments:");
      const all = await pool.query("SELECT id, name FROM departments ORDER BY name");
      all.rows.forEach(d => {
        console.log(`   [${d.id}] ${d.name}`);
      });
      
      console.log("\n⚠️  SOLUTION: Add 'Mechanical Engineering' to departments table:");
      console.log("   INSERT INTO departments (name, is_active) VALUES ('Mechanical Engineering', TRUE);");
    }
    
    console.log("\n");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkMechanicalEngineering();
