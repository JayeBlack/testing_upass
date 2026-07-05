require('dotenv').config();
const db = require('./src/db');

async function checkPrograms() {
  try {
    console.log('Checking programs table...\n');
    
    const result = await db.query('SELECT * FROM programs ORDER BY id');
    console.log(`Total programs: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      console.log('Programs:');
      result.rows.forEach(p => {
        console.log(`  - ${p.name} (Dept ID: ${p.department_id}, Active: ${p.is_active})`);
      });
    } else {
      console.log('❌ Programs table is EMPTY!');
      console.log('\nThis is why bulk upload fails - students need programs to enroll.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPrograms();
