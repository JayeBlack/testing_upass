require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'upass',
  password: '6742',
  port: 5432,
});

async function checkGradesAndCWA() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('GRADES & CWA DIAGNOSTIC');
    console.log('='.repeat(70) + '\n');

    // Check total grades
    const gradesCount = await client.query('SELECT COUNT(*) as count FROM grades');
    console.log(`📊 Total grade records: ${gradesCount.rows[0].count}`);

    // Check grades with marks
    const gradesWithMarks = await client.query('SELECT COUNT(*) as count FROM grades WHERE marks IS NOT NULL AND marks > 0');
    console.log(`✅ Grades with valid marks: ${gradesWithMarks.rows[0].count}`);

    // Check students with grades
    const studentsWithGrades = await client.query(`
      SELECT COUNT(DISTINCT g.student_id) as count
      FROM grades g
      WHERE g.marks IS NOT NULL AND g.marks > 0
    `);
    console.log(`👥 Students with grades: ${studentsWithGrades.rows[0].count}`);

    // Check courses referenced in grades
    const coursesInGrades = await client.query(`
      SELECT COUNT(DISTINCT g.course_id) as count
      FROM grades g
      WHERE g.marks IS NOT NULL AND g.marks > 0
    `);
    console.log(`📚 Courses with grades: ${coursesInGrades.rows[0].count}`);

    // Sample grades
    console.log('\n📋 Sample grade records (first 5):');
    const sampleGrades = await client.query(`
      SELECT g.id, g.student_id, g.course_id, g.grade, g.marks, g.semester, g.academic_year,
             s.index_number, c.code as course_code, c.name as course_name, c.credits
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN courses c ON g.course_id = c.id
      WHERE g.marks IS NOT NULL
      ORDER BY g.id
      LIMIT 5
    `);
    
    if (sampleGrades.rows.length > 0) {
      sampleGrades.rows.forEach(r => {
        console.log(`   Student: ${r.index_number || 'N/A'}, Course: ${r.course_code || 'N/A'}, Grade: ${r.grade}, Marks: ${r.marks}, Credits: ${r.credits || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  No grade records found');
    }

    // Check CWA calculation
    console.log('\n🎓 CWA Calculation Test:');
    const cwaTest = await client.query(`
      SELECT s.id, s.index_number,
             COUNT(g.id) as grade_count,
             SUM(c.credits) as total_credits,
             SUM(g.marks * c.credits) as weighted_sum,
             ROUND(SUM(g.marks * c.credits)::numeric / NULLIF(SUM(c.credits), 0), 2) as cwa
      FROM students s
      INNER JOIN grades g ON s.id = g.student_id
      INNER JOIN courses c ON g.course_id = c.id
      WHERE g.marks IS NOT NULL AND g.marks > 0
      GROUP BY s.id, s.index_number
      HAVING SUM(c.credits) > 0
      ORDER BY cwa DESC
      LIMIT 5
    `);

    if (cwaTest.rows.length > 0) {
      console.log('   Top 5 students by CWA:');
      cwaTest.rows.forEach((r, i) => {
        console.log(`   ${i+1}. ${r.index_number}: CWA ${r.cwa} (${r.grade_count} grades, ${r.total_credits} credits)`);
      });
    } else {
      console.log('   ⚠️  No CWA data available - cannot calculate from grades');
    }

    // Check CWA distribution
    console.log('\n📊 CWA Distribution:');
    const cwaDistribution = await client.query(`
      SELECT 
        cwa_range as range,
        COUNT(*) as count
      FROM (
        SELECT 
          CASE 
            WHEN cwa_val < 50 THEN '< 50'
            WHEN cwa_val >= 50 AND cwa_val < 60 THEN '50-59'
            WHEN cwa_val >= 60 AND cwa_val < 70 THEN '60-69'
            WHEN cwa_val >= 70 AND cwa_val < 80 THEN '70-79'
            WHEN cwa_val >= 80 AND cwa_val < 90 THEN '80-89'
            WHEN cwa_val >= 90 THEN '90+'
          END as cwa_range,
          cwa_val
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
      ) cwa_with_range
      GROUP BY cwa_range
      ORDER BY 
        CASE cwa_range
          WHEN '< 50' THEN 1
          WHEN '50-59' THEN 2
          WHEN '60-69' THEN 3
          WHEN '70-79' THEN 4
          WHEN '80-89' THEN 5
          WHEN '90+' THEN 6
        END
    `);

    if (cwaDistribution.rows.length > 0) {
      cwaDistribution.rows.forEach(r => {
        console.log(`   ${r.range}: ${r.count} student(s)`);
      });
    } else {
      console.log('   ⚠️  No CWA distribution data');
    }

    // Check graduands table
    console.log('\n🎓 Graduands Table:');
    const graduandsCount = await client.query('SELECT COUNT(*) as count FROM graduands');
    console.log(`   Total graduands: ${graduandsCount.rows[0].count}`);

    const graduandsByStatus = await client.query(`
      SELECT status, COUNT(*) as count
      FROM graduands
      GROUP BY status
    `);
    if (graduandsByStatus.rows.length > 0) {
      graduandsByStatus.rows.forEach(r => {
        console.log(`   ${r.status}: ${r.count}`);
      });
    }

    // Check for orphaned grades (grades referencing non-existent students/courses)
    console.log('\n🔍 Data Integrity Check:');
    const orphanedStudentGrades = await client.query(`
      SELECT COUNT(*) as count
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.id
      WHERE s.id IS NULL
    `);
    console.log(`   Grades with missing students: ${orphanedStudentGrades.rows[0].count}`);

    const orphanedCourseGrades = await client.query(`
      SELECT COUNT(*) as count
      FROM grades g
      LEFT JOIN courses c ON g.course_id = c.id
      WHERE c.id IS NULL
    `);
    console.log(`   Grades with missing courses: ${orphanedCourseGrades.rows[0].count}`);

    // Check courses without credits
    const coursesWithoutCredits = await client.query(`
      SELECT COUNT(*) as count
      FROM courses c
      INNER JOIN grades g ON c.id = g.course_id
      WHERE c.credits IS NULL OR c.credits = 0
    `);
    console.log(`   Courses with invalid credits: ${coursesWithoutCredits.rows[0].count}`);

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(70));

    if (gradesWithMarks.rows[0].count === 0) {
      console.log('\n❌ NO GRADES FOUND');
      console.log('\nTo fix:');
      console.log('1. Upload grades via Exams Officer > Grade Entry');
      console.log('2. Use sample files:');
      console.log('   - backend/excel-files/results_computer_science_sem1.xlsx');
      console.log('   - backend/excel-files/results_electrical_engineering_sem2.xlsx');
    } else {
      console.log('\n✅ Grades data is present');
      
      if (cwaTest.rows.length > 0) {
        console.log('✅ CWA calculation working');
      } else {
        console.log('⚠️  CWA calculation failing - check course credits');
      }

      if (orphanedStudentGrades.rows[0].count > 0 || orphanedCourseGrades.rows[0].count > 0) {
        console.log('⚠️  Data integrity issues - some grades reference missing records');
      }
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

checkGradesAndCWA();
