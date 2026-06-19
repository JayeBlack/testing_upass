const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('RUNNING DATABASE MIGRATIONS');
    console.log('='.repeat(60) + '\n');
    
    const client = await pool.connect();
    
    try {
      // Read and execute the migration file
      const migrationPath = path.join(__dirname, 'migrations', '001_ensure_departments.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log('📝 Executing: 001_ensure_departments.sql\n');
      
      await client.query(migrationSQL);
      
      console.log('✅ Migration completed successfully!\n');
      
      // Show final department list
      const result = await client.query('SELECT id, name FROM departments ORDER BY name');
      console.log(`📋 ${result.rows.length} departments in database:\n`);
      result.rows.forEach(d => {
        console.log(`   [${d.id}] ${d.name}`);
      });
      console.log('\n' + '='.repeat(60));
      console.log('✅ All migrations complete!');
      console.log('='.repeat(60) + '\n');
      
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
