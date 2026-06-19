const db = require("./src/db");

async function testFeesEndpoints() {
  console.log("\n=== TESTING FEES ENDPOINTS ===\n");

  try {
    // Test 1: Check if fee_records table has data
    console.log("1. Checking fee_records table...");
    const feeRecords = await db.query("SELECT COUNT(*) as count FROM fee_records");
    console.log(`   Found ${feeRecords.rows[0].count} fee records in database`);

    if (feeRecords.rows[0].count > 0) {
      const sample = await db.query("SELECT * FROM fee_records LIMIT 1");
      console.log("   Sample record:", JSON.stringify(sample.rows[0], null, 2));
    }

    // Test 2: Check students table
    console.log("\n2. Checking students table...");
    const students = await db.query("SELECT COUNT(*) as count FROM students");
    console.log(`   Found ${students.rows[0].count} students in database`);

    // Test 3: Test the summary query
    console.log("\n3. Testing fee summary query...");
    const summary = await db.query(`
      SELECT
        COUNT(*) AS total_students,
        COALESCE(SUM(total_amount), 0) AS total_fees,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding,
        COUNT(*) FILTER (WHERE is_cleared) AS cleared_count,
        COUNT(*) FILTER (WHERE NOT is_cleared) AS owing_count,
        ROUND(COUNT(*) FILTER (WHERE is_cleared) * 100.0 / NULLIF(COUNT(*), 0), 1) AS compliance_rate
      FROM fee_records f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `);
    console.log("   Summary result:", JSON.stringify(summary.rows[0], null, 2));

    // Test 4: Test the full fees query
    console.log("\n4. Testing full fees query...");
    const fullFees = await db.query(`
      SELECT f.*, s.index_number, u.first_name, u.last_name, d.name AS department_name, p.name AS program_name
      FROM fee_records f
      JOIN students s ON f.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN programs p ON s.program_id = p.id
      WHERE 1=1
      ORDER BY u.last_name
      LIMIT 3
    `);
    console.log(`   Found ${fullFees.rows.length} records (showing first 3)`);
    fullFees.rows.forEach((row, i) => {
      console.log(`   Record ${i + 1}:`, {
        student: `${row.first_name} ${row.last_name}`,
        index: row.index_number,
        total: row.total_amount,
        paid: row.amount_paid,
        cleared: row.is_cleared
      });
    });

    // Test 5: Check users with Registrar or AdminAssistant role
    console.log("\n5. Checking Registrar/AdminAssistant users...");
    const staffUsers = await db.query(`
      SELECT id, email, role FROM users 
      WHERE role IN ('Registrar', 'AdminAssistant') 
      AND is_active = true
    `);
    console.log(`   Found ${staffUsers.rows.length} staff users:`);
    staffUsers.rows.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });

    console.log("\n=== TEST COMPLETE ===\n");
    
  } catch (err) {
    console.error("ERROR:", err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testFeesEndpoints();
