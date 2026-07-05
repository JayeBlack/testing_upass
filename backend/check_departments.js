require('dotenv').config();
const db = require('./src/db');

async function checkDepartments() {
  try {
    console.log('Checking departments table...\n');
    
    const result = await db.query('SELECT * FROM departments ORDER BY id');
    console.log(`Total departments: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      console.log('Departments:');
      result.rows.forEach(d => {
        console.log(`  ${d.id}. ${d.name} (Active: ${d.is_active})`);
      });
    } else {
      console.log('❌ Departments table is EMPTY!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkDepartments();
