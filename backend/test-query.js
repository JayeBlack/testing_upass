const db = require("./src/db");

async function testQuery() {
  try {
    console.log("Testing database connection...");
    
    // Test 1: Check if students table exists and has data
    const studentsCount = await db.query("SELECT COUNT(*) as count FROM students");
    console.log("Total students in DB:", studentsCount.rows[0].count);
    
    // Test 2: Get all students with their details
    const allStudents = await db.query(`
      SELECT s.id, s.index_number, s.status, s.admission_year,
             u.first_name, u.last_name, u.email,
             d.name as department_name,
             p.name as program_name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN programs p ON s.program_id = p.id
    `);
    console.log("\nAll students:", JSON.stringify(allStudents.rows, null, 2));
    
    // Test 3: Run the analytics query
    const analyticsQuery = await db.query(`
      SELECT COUNT(s.id) as total, 
             COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active
      FROM students s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.id IS NOT NULL
    `);
    console.log("\nAnalytics query result:", analyticsQuery.rows[0]);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

testQuery();
