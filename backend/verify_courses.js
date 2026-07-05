require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'upass',
  password: '6742',
  port: 5432,
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

async function verifyCourses() {
  const client = await db.pool.connect();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('VERIFYING COURSE CODE SYNCHRONIZATION');
    console.log('Frontend Catalog ↔️ Database');
    console.log('='.repeat(60) + '\n');
    
    // Get all courses from database
    const result = await client.query(`
      SELECT c.code, c.name, c.credits, c.course_type, 
             p.name as program_name, d.name as department_name
      FROM courses c
      LEFT JOIN programs p ON c.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE c.is_active = TRUE
      ORDER BY d.name, c.code
    `);
    
    console.log(`📊 Found ${result.rows.length} active courses in database\n`);
    
    // Group by department
    const byDept = {};
    for (const row of result.rows) {
      const dept = row.department_name || 'Unassigned';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(row);
    }
    
    // Display organized by department
    for (const [dept, courses] of Object.entries(byDept).sort()) {
      console.log(`\n📚 ${dept}:`);
      console.log('   ' + '-'.repeat(56));
      
      for (const course of courses) {
        const category = course.course_type === 'mandatory' ? '🔴' : 
                        course.course_type === 'core' ? '🟡' : '🟢';
        console.log(`   ${category} ${course.code.padEnd(10)} ${course.name}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Legend:');
    console.log('  🔴 Mandatory (Research/Thesis)');
    console.log('  🟡 Core (Required taught courses)');
    console.log('  🟢 Elective (Optional courses)');
    console.log('='.repeat(60) + '\n');
    
    // Sample verification - check if specific courses exist
    console.log('Sample Course Code Verification:\n');
    const sampleCodes = ['PE 500', 'CE 571', 'GM 555', 'EL 551', 'MA 573', 'MN 554'];
    
    for (const code of sampleCodes) {
      const found = await client.query('SELECT name FROM courses WHERE code = $1', [code]);
      if (found.rows.length > 0) {
        console.log(`  ✅ ${code} - ${found.rows[0].name}`);
      } else {
        console.log(`  ❌ ${code} - NOT FOUND`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification Complete!');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

verifyCourses();
