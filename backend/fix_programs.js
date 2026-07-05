const { Pool } = require('pg');
require('dotenv').config();

async function fixPrograms() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('FIXING PROGRAMS - CLEARING DUPLICATES');
    console.log('='.repeat(60) + '\n');
    
    // Delete all existing programs
    const deleteResult = await client.query('DELETE FROM programs');
    console.log(`✅ Deleted ${deleteResult.rowCount} existing programs\n`);
    
    console.log('Now run: node backend/populate_programs.js\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPrograms();
