require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'upass',
  password: '6742',
  port: 5432,
});

async function checkAnalyticsData() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('ANALYTICS DATA VERIFICATION FOR EXAMS OFFICER');
    console.log('='.repeat(70) + '\n');

    // Check students
    const studentsResult = await client.query('SELECT COUNT(*) as count FROM students');
    const studentCount = parseInt(studentsResult.rows[0].count);
    console.log(`✅ Students: ${studentCount}`);
    if (studentCount === 0) {
      console.log('   ⚠️  WARNING: No students in database. Upload students first.');
    }

    // Check departments
    const deptsResult = await client.query('SELECT COUNT(*) as count FROM departments WHERE is_active = TRUE');
    const deptCount = parseInt(deptsResult.rows[0].count);
    console.log(`✅ Active Departments: ${deptCount}`);

    // Check programs
    const progsResult = await client.query('SELECT COUNT(*) as count FROM programs WHERE is_active = TRUE');
    const progCount = parseInt(progsResult.rows[0].count);
    console.log(`✅ Active Programs: ${progCount}`);
    if (progCount === 0) {
      console.log('   ⚠️  WARNING: No programs in database. Run: node backend/populate_programs.js');
    }

    // Check enrollment by department
    const enrollResult = await client.query(`
      SELECT d.name, COUNT(s.id) as students
      FROM departments d
      LEFT JOIN students s ON d.id = s.department_id
      WHERE d.is_active = TRUE
      GROUP BY d.name
      ORDER BY students DESC
    `);
    console.log(`\n📊 Enrollment by Department:`);
    if (enrollResult.rows.length > 0) {
      enrollResult.rows.forEach(r => {
        console.log(`   ${r.name}: ${r.students} student(s)`);
      });
    } else {
      console.log('   ⚠️  No enrollment data available');
    }

    // Check grades for CWA
    const gradesResult = await client.query('SELECT COUNT(*) as count FROM grades WHERE marks IS NOT NULL');
    const gradeCount = parseInt(gradesResult.rows[0].count);
    console.log(`\n✅ Grade Records: ${gradeCount}`);
    if (gradeCount === 0) {
      console.log('   ⚠️  WARNING: No grades in database. CWA distribution will be empty.');
      console.log('   Upload results using Exams Officer > Grade Entry');
    }

    // Check CWA distribution
    const cwaResult = await client.query(`
      SELECT 
        CASE 
          WHEN cwa_val < 50 THEN '< 50'
          WHEN cwa_val >= 50 AND cwa_val < 60 THEN '50-59'
          WHEN cwa_val >= 60 AND cwa_val < 70 THEN '60-69'
          WHEN cwa_val >= 70 AND cwa_val < 80 THEN '70-79'
          WHEN cwa_val >= 80 AND cwa_val < 90 THEN '80-89'
          WHEN cwa_val >= 90 THEN '90+'
        END as range,
        COUNT(*) as count
      FROM (
        SELECT ROUND(SUM(g.marks * c.credits)::numeric / NULLIF(SUM(c.credits), 0), 2) as cwa_val
        FROM students s
        INNER JOIN grades g ON s.id = g.student_id
        INNER JOIN courses c ON g.course_id = c.id
        WHERE g.marks IS NOT NULL AND g.marks > 0
        GROUP BY s.id
        HAVING SUM(c.credits) > 0
      ) cwa_calc
      WHERE cwa_val IS NOT NULL
      GROUP BY range
      ORDER BY 
        CASE range
          WHEN '< 50' THEN 1
          WHEN '50-59' THEN 2
          WHEN '60-69' THEN 3
          WHEN '70-79' THEN 4
          WHEN '80-89' THEN 5
          WHEN '90+' THEN 6
        END
    `);
    
    console.log(`\n📈 CWA Distribution:`);
    if (cwaResult.rows.length > 0) {
      cwaResult.rows.forEach(r => {
        console.log(`   ${r.range}: ${r.count} student(s)`);
      });
    } else {
      console.log('   ⚠️  No CWA data available (requires grades)');
    }

    // Check fee records
    const feesResult = await client.query('SELECT COUNT(*) as count FROM fee_records');
    const feeCount = parseInt(feesResult.rows[0].count);
    console.log(`\n✅ Fee Records: ${feeCount}`);

    // Check graduands
    const graduandsResult = await client.query('SELECT COUNT(*) as count FROM graduands');
    const graduandCount = parseInt(graduandsResult.rows[0].count);
    console.log(`✅ Graduands: ${graduandCount}`);

    // Check ExamsOfficer users
    const examsOfficerResult = await client.query(`SELECT COUNT(*) as count FROM users WHERE role = 'ExamsOfficer'`);
    const examsOfficerCount = parseInt(examsOfficerResult.rows[0].count);
    console.log(`\n✅ ExamsOfficer Users: ${examsOfficerCount}`);
    if (examsOfficerCount === 0) {
      console.log('   ⚠️  No ExamsOfficer users found. Create one via Manage Users.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    
    if (studentCount > 0 && progCount > 0 && deptCount > 0) {
      console.log('✅ Basic data present - Analytics will display enrollment data');
    } else {
      console.log('⚠️  Missing basic data:');
      if (studentCount === 0) console.log('   - Upload students');
      if (progCount === 0) console.log('   - Run: node backend/populate_programs.js');
      if (deptCount === 0) console.log('   - Run: node backend/run_migrations.js');
    }
    
    if (gradeCount > 0) {
      console.log('✅ Grade data present - CWA analytics will display');
    } else {
      console.log('⚠️  No grades - Upload results via Exams Officer > Grade Entry');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAnalyticsData();
