const db = require("./src/db");

async function testAnalyticsEndpoint() {
  console.log("🔍 Testing Analytics Overview Endpoint\n");
  console.log("=" .repeat(60));

  try {
    // Simulate the exact query from analyticsController.js
    const department = undefined; // or 'all'
    const academic_year = undefined;
    
    let deptFilter = "";
    let yearFilter = "";
    const params = [];
    let paramIndex = 1;

    if (department && department !== "all") {
      deptFilter = ` AND d.name = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (academic_year) {
      yearFilter = ` AND s.admission_year = $${paramIndex}`;
      params.push(academic_year);
      paramIndex++;
    }

    console.log("\n1️⃣ Testing Students Query:");
    console.log("Query:", `SELECT COUNT(s.id) as total, 
              COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id IS NOT NULL ${deptFilter} ${yearFilter}`);
    console.log("Params:", params);

    const studentsQuery = await db.query(
      `SELECT COUNT(s.id) as total, 
              COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id IS NOT NULL ${deptFilter} ${yearFilter}`,
      params
    );

    console.log("Result:", studentsQuery.rows[0]);

    console.log("\n2️⃣ Testing Graduands Query:");
    const graduandsQuery = await db.query(
      `SELECT COUNT(CASE WHEN g.status = 'Eligible' THEN 1 END) as eligible,
              COUNT(CASE WHEN g.status = 'Ineligible' THEN 1 END) as ineligible
       FROM graduands g
       JOIN students s ON g.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE 1=1 ${deptFilter} ${yearFilter}`,
      params
    );
    console.log("Result:", graduandsQuery.rows[0]);

    console.log("\n3️⃣ Testing Fees Query:");
    const feesQuery = await db.query(
      `SELECT 
         COALESCE(SUM(f.amount_paid), 0) as collected,
         COALESCE(SUM(f.outstanding), 0) as owing,
         COUNT(CASE WHEN f.is_cleared = TRUE THEN 1 END) as cleared_count,
         COUNT(CASE WHEN f.is_cleared = FALSE THEN 1 END) as owing_count
       FROM fee_records f
       JOIN students s ON f.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE 1=1 ${deptFilter} ${yearFilter}`,
      params
    );
    console.log("Result:", feesQuery.rows[0]);

    console.log("\n4️⃣ Testing CWA Query:");
    const cwaQuery = await db.query(
      `SELECT AVG(g.cwa) as avg_cwa
       FROM graduands g
       JOIN students s ON g.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE g.cwa IS NOT NULL ${deptFilter} ${yearFilter}`,
      params
    );
    console.log("Result:", cwaQuery.rows[0]);

    console.log("\n5️⃣ Testing Thesis Query:");
    const thesisQuery = { rows: [{ defended: 0 }] };
    console.log("Result (fixed - returns 0 for now):", thesisQuery.rows[0]);

    // Build final overview object
    const students = studentsQuery.rows[0];
    const graduands = graduandsQuery.rows[0];
    const fees = feesQuery.rows[0];
    const totalFees = parseFloat(fees.collected || 0) + parseFloat(fees.owing || 0);
    const collectionRate = totalFees > 0 ? Math.round((parseFloat(fees.collected || 0) / totalFees) * 100) : 0;

    const overview = {
      total_students: parseInt(students.total) || 0,
      active_students: parseInt(students.active) || 0,
      graduands_eligible: parseInt(graduands.eligible) || 0,
      graduands_ineligible: parseInt(graduands.ineligible) || 0,
      fees_collected: parseFloat(fees.collected) || 0,
      fees_owing: parseFloat(fees.owing) || 0,
      fees_cleared: parseInt(fees.cleared_count) || 0,
      fees_owing_count: parseInt(fees.owing_count) || 0,
      collection_rate: collectionRate,
      avg_cwa: parseFloat(cwaQuery.rows[0].avg_cwa || 0).toFixed(1),
      thesis_defended: parseInt(thesisQuery.rows[0].defended) || 0,
    };

    console.log("\n📊 FINAL OVERVIEW OBJECT:");
    console.log(JSON.stringify(overview, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("✅ Test complete!\n");

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

testAnalyticsEndpoint();
