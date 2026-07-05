const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Helper function to generate unique program code from name
async function generateUniqueProgramCode(client, name, departmentId) {
  let baseCode = name.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
  if (baseCode.includes(" ")) {
    baseCode = baseCode.split(" ").map(w => w[0]).join("").substring(0, 10);
  } else {
    baseCode = baseCode.substring(0, 10);
  }
  
  let code = baseCode || "PROG";
  let counter = 1;
  
  // Check if code already exists (globally or in same department)
  while (true) {
    const existing = await client.query(
      'SELECT id FROM programs WHERE code = $1',
      [code]
    );
    
    if (existing.rows.length === 0) {
      return code;
    }
    
    // If code exists, append counter and try again
    const suffix = counter.toString();
    code = baseCode.substring(0, 10 - suffix.length) + suffix;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 100) {
      throw new Error(`Could not generate unique code for ${name}`);
    }
  }
}

// Postgraduate programs by department
const programsByDepartment = {
  'Computer Science and Engineering': ['MSc Computer Science', 'PhD Computer Science'],
  'Electrical and Electronic Engineering': ['MSc Electrical Engineering', 'MPhil Electrical Engineering', 'PhD Electrical Engineering'],
  'Environmental and Safety Engineering': ['MSc Environmental Engineering', 'MSc Safety Engineering', 'PhD Environmental Engineering'],
  'Geomatic Engineering': ['MSc Geomatic Engineering', 'PhD Geomatic Engineering'],
  'Mathematical Sciences': ['MSc Mathematics', 'MSc Statistics', 'PhD Mathematical Sciences'],
  'Mechanical Engineering': ['MSc Mechanical Engineering', 'MPhil Mechanical Engineering', 'PhD Mechanical Engineering'],
  'Mining Engineering': ['MSc Mining Engineering', 'MPhil Mining Engineering', 'PhD Mining Engineering'],
  'Petroleum Engineering': ['MSc Petroleum Engineering', 'MPhil Petroleum Engineering', 'PhD Petroleum Engineering'],
  'Mineral Engineering': ['MSc Mineral Engineering', 'PhD Mineral Engineering'],
  'Metallurgical Engineering': ['MSc Metallurgical Engineering', 'PhD Metallurgical Engineering']
};

async function populatePrograms() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n' + '='.repeat(60));
    console.log('POPULATING PROGRAMS');
    console.log('='.repeat(60) + '\n');
    
    console.log('Fetching departments...\n');
    const deptResult = await client.query('SELECT id, name FROM departments WHERE is_active = TRUE');
    const departments = new Map(deptResult.rows.map(d => [d.name, d.id]));
    
    console.log(`Found ${departments.size} departments\n`);
    
    let insertCount = 0;
    let skipCount = 0;
    
    for (const [deptName, programs] of Object.entries(programsByDepartment)) {
      const deptId = departments.get(deptName);
      
      if (!deptId) {
        console.log(`⚠️  Skipping department "${deptName}" - not found in database`);
        continue;
      }
      
      console.log(`\n📚 ${deptName} (ID: ${deptId}):`);
      
      for (const programName of programs) {
        // Check if program already exists
        const existing = await client.query(
          'SELECT id FROM programs WHERE LOWER(name) = LOWER($1)',
          [programName]
        );
        
        if (existing.rows.length > 0) {
          console.log(`   ⏭️  ${programName} (already exists)`);
          skipCount++;
        } else {
          const code = await generateUniqueProgramCode(client, programName, deptId);
          await client.query(
            'INSERT INTO programs (name, code, department_id, is_active) VALUES ($1, $2, $3, TRUE)',
            [programName, code, deptId]
          );
          console.log(`   ✅ ${programName} (Code: ${code})`);
          insertCount++;
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully inserted ${insertCount} new programs`);
    console.log(`⏭️  Skipped ${skipCount} existing programs`);
    console.log('='.repeat(60));
    
    // Verify final count
    const finalCount = await client.query('SELECT COUNT(*) FROM programs');
    console.log(`\n📊 Total programs in database: ${finalCount.rows[0].count}`);
    
    // Show programs by department
    const progByDept = await client.query(`
      SELECT d.name as department, COUNT(p.id) as program_count
      FROM departments d
      LEFT JOIN programs p ON d.id = p.department_id
      WHERE d.is_active = TRUE
      GROUP BY d.name
      ORDER BY d.name
    `);
    
    console.log('\n📋 Programs per department:');
    progByDept.rows.forEach(r => {
      console.log(`   ${r.department}: ${r.program_count} program(s)`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Complete!');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

populatePrograms();
