require('dotenv').config();
const db = require('./src/db');

async function testBulkUpload() {
  try {
    console.log('Testing bulk upload logic...\n');
    
    // Check programs
    const programs = await db.query('SELECT id, name, code, department_id FROM programs ORDER BY id');
    console.log(`✅ Found ${programs.rows.length} programs`);
    
    // Check departments
    const depts = await db.query('SELECT id, name FROM departments ORDER BY id');
    console.log(`✅ Found ${depts.rows.length} departments\n`);
    
    console.log('Departments:');
    depts.rows.forEach(d => {
      console.log(`  - ${d.name} (ID: ${d.id})`);
    });
    
    console.log('\nPrograms by Department:');
    const progsByDept = {};
    programs.rows.forEach(p => {
      const dept = depts.rows.find(d => d.id === p.department_id);
      const deptName = dept ? dept.name : 'Unknown';
      if (!progsByDept[deptName]) progsByDept[deptName] = [];
      progsByDept[deptName].push(`${p.name} (${p.code})`);
    });
    
    Object.keys(progsByDept).sort().forEach(dept => {
      console.log(`\n  ${dept}:`);
      progsByDept[dept].forEach(prog => {
        console.log(`    - ${prog}`);
      });
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testBulkUpload();
