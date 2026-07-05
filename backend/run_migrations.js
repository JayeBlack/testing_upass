const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('POPULATING DEPARTMENTS');
    console.log('='.repeat(60) + '\n');
    
    const client = await pool.connect();
    
    try {
      const departments = [
        'Computer Science and Engineering',
        'Electrical and Electronic Engineering',
        'Environmental and Safety Engineering',
        'Finance Office',
        'Geological Engineering',
        'Geomatic Engineering',
        'Management Studies',
        'Mathematical Sciences',
        'Mechanical Engineering',
        'Minerals Engineering',
        'Mining Engineering',
        'Petroleum Engineering',
        'School of Postgraduate Studies',
      ];
      
      console.log('📝 Inserting departments...\n');
      
      for (const dept of departments) {
        await client.query(
          `INSERT INTO departments (name, is_active) 
           VALUES ($1, TRUE) 
           ON CONFLICT (name) DO NOTHING`,
          [dept]
        );
      }
      
      console.log('✅ Departments populated successfully!\n');
      
      // Show final department list
      const result = await client.query('SELECT id, name, is_active FROM departments ORDER BY name');
      console.log(`📋 ${result.rows.length} departments in database:\n`);
      result.rows.forEach(d => {
        const status = d.is_active ? '✓' : '✗';
        console.log(`   ${status} [${d.id}] ${d.name}`);
      });
      console.log('\n' + '='.repeat(60));
      console.log('✅ Complete!');
      console.log('='.repeat(60) + '\n');
      
      console.log('💡 Next Step:');
      console.log('   To populate courses with correct codes matching the frontend,');
      console.log('   run: node backend/populate_courses.js\n');
      
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
