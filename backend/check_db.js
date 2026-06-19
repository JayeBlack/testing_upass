const db = require("./src/db");

async function checkDatabase() {
  console.log("🔍 UPASS Database Health Check\n");
  console.log("=" .repeat(60));

  try {
    // Test connection
    await db.query("SELECT NOW()");
    console.log("✅ Database connection: OK\n");

    // Check tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`📊 Tables found: ${tables.rows.length}`);
    tables.rows.forEach((t, i) => console.log(`   ${i + 1}. ${t.table_name}`));

    // Check users
    const users = await db.query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
    console.log("\n👥 Users by role:");
    users.rows.forEach((r) => console.log(`   ${r.role}: ${r.count}`));

    // Check students
    const students = await db.query("SELECT status, COUNT(*) as count FROM students GROUP BY status");
    console.log("\n🎓 Students by status:");
    students.rows.forEach((r) => console.log(`   ${r.status}: ${r.count}`));

    // Check departments
    const depts = await db.query("SELECT name, is_active FROM departments ORDER BY name");
    console.log("\n🏛️  Departments:");
    depts.rows.forEach((d) => console.log(`   ${d.name} (${d.is_active ? "Active" : "Inactive"})`));

    // Check programmes
    const progs = await db.query("SELECT name, degree_type FROM programs ORDER BY name");
    console.log(`\n📚 Programmes: ${progs.rows.length}`);
    progs.rows.slice(0, 10).forEach((p) => console.log(`   ${p.name} (${p.degree_type})`));
    if (progs.rows.length > 10) console.log(`   ... and ${progs.rows.length - 10} more`);

    // Check courses
    const courses = await db.query("SELECT COUNT(*) as count FROM courses WHERE is_active = true");
    console.log(`\n📖 Active courses: ${courses.rows[0].count}`);

    // Check fees
    const fees = await db.query(`
      SELECT 
        SUM(total_amount) as total_fees,
        SUM(amount_paid) as total_paid,
        SUM(outstanding) as total_outstanding,
        COUNT(*) as student_count
      FROM fee_records
    `);
    console.log("\n💰 Financial Summary:");
    if (fees.rows[0].total_fees) {
      const f = fees.rows[0];
      console.log(`   Total Fees: GHS ${parseFloat(f.total_fees).toLocaleString()}`);
      console.log(`   Total Paid: GHS ${parseFloat(f.total_paid).toLocaleString()}`);
      console.log(`   Outstanding: GHS ${parseFloat(f.total_outstanding).toLocaleString()}`);
      console.log(`   Students with fees: ${f.student_count}`);
    } else {
      console.log("   No fee records found");
    }

    // Check thesis submissions (Supabase)
    console.log("\n📝 Thesis submissions: Check Supabase dashboard");

    // Check results
    const results = await db.query("SELECT COUNT(*) as count FROM grades");
    console.log(`\n📊 Result entries: ${results.rows[0].count}`);

    // Check clearances
    const clearances = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM clearance_steps 
      GROUP BY status
    `);
    console.log("\n✅ Clearances by status:");
    if (clearances.rows.length > 0) {
      clearances.rows.forEach((c) => console.log(`   ${c.status}: ${c.count}`));
    } else {
      console.log("   No clearance records");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Database check complete!\n");

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

checkDatabase();
