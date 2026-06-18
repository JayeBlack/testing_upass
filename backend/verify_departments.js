require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDepartments() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("DEPARTMENT PERSISTENCE VERIFICATION");
    console.log("=".repeat(60) + "\n");

    // 1. Check all departments
    console.log("1️⃣  DEPARTMENTS IN SYSTEM:");
    console.log("-".repeat(60));
    const depts = await pool.query("SELECT id, name FROM departments ORDER BY name");
    if (depts.rows.length === 0) {
      console.log("❌ NO DEPARTMENTS FOUND! This is a problem.");
    } else {
      depts.rows.forEach(d => {
        console.log(`   ✓ [${d.id}] ${d.name}`);
      });
    }
    console.log("");

    // 2. Check all non-student users with departments
    console.log("2️⃣  ALL STAFF USERS WITH DEPARTMENTS:");
    console.log("-".repeat(60));
    const users = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.role,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.department_id,
        d.name as department_name,
        u.created_at::date
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role != 'Student'
      ORDER BY u.created_at DESC
    `);
    
    if (users.rows.length === 0) {
      console.log("   ℹ️  No staff users found");
    } else {
      users.rows.forEach(u => {
        const deptStatus = u.department_id ? "✅" : "❌";
        const dept = u.department_name || "NO DEPARTMENT";
        console.log(`   ${deptStatus} ${u.email} (${u.role}) → ${dept}`);
      });
    }
    console.log("");

    // 3. Check users WITHOUT department
    console.log("3️⃣  STAFF USERS WITHOUT DEPARTMENT (Should be empty):");
    console.log("-".repeat(60));
    const noDept = await pool.query(`
      SELECT u.id, u.email, u.role, CONCAT(u.first_name, ' ', u.last_name) as name
      FROM users u
      WHERE u.department_id IS NULL AND u.role != 'Student'
    `);
    
    if (noDept.rows.length === 0) {
      console.log("   ✅ All staff users have departments assigned!");
    } else {
      console.log(`   ❌ Found ${noDept.rows.length} users WITHOUT departments:`);
      noDept.rows.forEach(u => {
        console.log(`      - ${u.email} (${u.role})`);
      });
    }
    console.log("");

    // 4. Check supervisors
    console.log("4️⃣  SUPERVISORS WITH DEPARTMENT INFO:");
    console.log("-".repeat(60));
    const supervisors = await pool.query(`
      SELECT 
        u.email,
        s.staff_id,
        s.title,
        s.specialization,
        s.department_id as sup_dept_id,
        u.department_id as user_dept_id,
        d.name as department_name
      FROM supervisors s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      ORDER BY s.created_at DESC
    `);
    
    if (supervisors.rows.length === 0) {
      console.log("   ℹ️  No supervisors found");
    } else {
      supervisors.rows.forEach(s => {
        const deptStatus = s.sup_dept_id ? "✅" : "❌";
        const dept = s.department_name || "NO DEPARTMENT";
        const title = s.title || "N/A";
        const staff_id = s.staff_id || "N/A";
        const spec = s.specialization || "N/A";
        
        console.log(`   ${deptStatus} ${s.email}`);
        console.log(`      Department: ${dept}`);
        console.log(`      Title: ${title}, Staff ID: ${staff_id}`);
        console.log(`      Specialization: ${spec}`);
        console.log("");
      });
    }

    // 5. Summary
    console.log("=".repeat(60));
    console.log("SUMMARY:");
    console.log("=".repeat(60));
    const withDept = users.rows.filter(u => u.department_id !== null).length;
    const withoutDept = noDept.rows.length;
    const total = users.rows.length;
    
    console.log(`Total Staff Users: ${total}`);
    console.log(`✅ With Department: ${withDept}`);
    console.log(`❌ Without Department: ${withoutDept}`);
    
    if (withoutDept === 0 && total > 0) {
      console.log("\n🎉 SUCCESS! All staff users have departments assigned!");
    } else if (withoutDept > 0) {
      console.log("\n⚠️  WARNING! Some users are missing departments.");
      console.log("   Try creating a new user to test if the fix is working.");
    } else {
      console.log("\nℹ️  No staff users in database yet. Create one to test!");
    }
    console.log("");

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkDepartments();
