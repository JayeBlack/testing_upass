const db = require("./src/db");

async function checkStudents() {
  console.log("🔍 Checking Student Data\n");
  console.log("=" .repeat(60));

  try {
    // Check students table
    const students = await db.query(`
      SELECT 
        s.id, 
        s.user_id,
        s.index_number,
        s.status,
        s.admission_year,
        s.department_id,
        s.program_id,
        u.first_name,
        u.last_name,
        u.email,
        d.name as department_name,
        p.name as program_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN programs p ON s.program_id = p.id
      ORDER BY s.id
    `);

    console.log(`\n📊 Total Students in Database: ${students.rows.length}\n`);

    if (students.rows.length > 0) {
      students.rows.forEach((s, i) => {
        console.log(`${i + 1}. ${s.first_name} ${s.last_name}`);
        console.log(`   ID: ${s.id} | User ID: ${s.user_id}`);
        console.log(`   Index: ${s.index_number || 'N/A'}`);
        console.log(`   Status: ${s.status}`);
        console.log(`   Department: ${s.department_name || 'Not assigned'}`);
        console.log(`   Program: ${s.program_name || 'Not assigned'}`);
        console.log(`   Admission Year: ${s.admission_year || 'N/A'}`);
        console.log();
      });
    } else {
      console.log("   ⚠️ No students found in database\n");
    }

    // Check users with Student role
    const studentUsers = await db.query(`
      SELECT id, email, first_name, last_name, role, is_active
      FROM users
      WHERE role = 'Student'
    `);

    console.log(`\n👥 Users with 'Student' role: ${studentUsers.rows.length}\n`);
    studentUsers.rows.forEach((u, i) => {
      console.log(`${i + 1}. ${u.first_name} ${u.last_name} (${u.email})`);
      console.log(`   User ID: ${u.id} | Active: ${u.is_active}`);
      console.log();
    });

    // Check if student users have entries in students table
    console.log("\n🔗 Checking User-Student Link:\n");
    for (const user of studentUsers.rows) {
      const linked = await db.query(
        "SELECT id FROM students WHERE user_id = $1",
        [user.id]
      );
      if (linked.rows.length === 0) {
        console.log(`   ❌ User ${user.first_name} ${user.last_name} (ID: ${user.id}) has NO student record`);
      } else {
        console.log(`   ✅ User ${user.first_name} ${user.last_name} (ID: ${user.id}) → Student ID: ${linked.rows[0].id}`);
      }
    }

    // Test analytics query
    console.log("\n\n📊 Testing Analytics Query:\n");
    const analyticsTest = await db.query(`
      SELECT COUNT(s.id) as total, 
             COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.id IS NOT NULL
    `);

    console.log(`   Total Students (Analytics Query): ${analyticsTest.rows[0].total}`);
    console.log(`   Active Students: ${analyticsTest.rows[0].active}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Check complete!\n");

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

checkStudents();
