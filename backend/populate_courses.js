require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

// Import course catalogs from frontend data
// These course codes MUST match what students see in the frontend
const COURSE_CATALOGS = {
  'Petroleum Engineering': {
    'MSc': [
      { code: "PE 500", name: "Thesis", credits: 3, category: "mandatory" },
      { code: "PE 550", name: "Graduate Seminar", credits: 3, category: "mandatory" },
      { code: "PE 556", name: "Labwork/Fieldwork and Report", credits: 3, category: "mandatory" },
      { code: "PE 511", name: "Introduction to Petroleum Engineering", credits: 3, category: "elective" },
      { code: "PE 513", name: "Introduction to Engineering Mechanics", credits: 3, category: "elective" },
      { code: "PE 574", name: "Health, Safety and Environment in Petroleum Industry", credits: 3, category: "elective" },
      { code: "PE 576", name: "Petroleum Economics and Management", credits: 3, category: "elective" },
      { code: "PE 578", name: "Offshore Drilling Technology", credits: 3, category: "elective" },
      { code: "PE 582", name: "Advanced Reservoir Modelling and Simulation", credits: 3, category: "elective" },
      { code: "PE 584", name: "Improved Recovery Methods", credits: 3, category: "elective" },
      { code: "PE 586", name: "Well Test Analysis", credits: 3, category: "elective" },
      { code: "PE 588", name: "Multi-phase Flow in Pipes", credits: 3, category: "elective" },
      { code: "PE 592", name: "Advanced Well Logging", credits: 3, category: "elective" },
      { code: "PE 594", name: "Petroleum Refinery Operations", credits: 3, category: "elective" },
    ]
  },
  'Computer Science and Engineering': {
    'MSc': [
      { code: "CE 500", name: "MSc Thesis", credits: 21, category: "mandatory" },
      { code: "CE 550", name: "MSc Seminar", credits: 3, category: "mandatory" },
      { code: "CE 551", name: "Research Methods", credits: 3, category: "mandatory" },
      { code: "CE 556", name: "Field/Laboratory Work", credits: 3, category: "mandatory" },
      { code: "CE 571", name: "Very Large Scale Integration (VLSI)", credits: 3, category: "core" },
      { code: "CE 573", name: "Optimisation Methods and Applications", credits: 3, category: "core" },
      { code: "CE 575", name: "Realtime Systems", credits: 3, category: "core" },
      { code: "CE 577", name: "Parallel Computing", credits: 3, category: "core" },
      { code: "CE 579", name: "Data Mining", credits: 3, category: "core" },
      { code: "CE 589", name: "Information Theory and Coding", credits: 3, category: "core" },
      { code: "CE 581", name: "Probability and Random Processes", credits: 3, category: "elective" },
      { code: "CE 583", name: "Computational Intelligence", credits: 3, category: "elective" },
      { code: "CE 572", name: "Multi-Agent Systems", credits: 3, category: "elective" },
      { code: "CE 574", name: "Computer Vision and Pattern Recognition", credits: 3, category: "elective" },
      { code: "CE 576", name: "Natural Language Processing", credits: 3, category: "elective" },
    ]
  },
  'Geomatic Engineering': {
    'MSc': [
      { code: "GM 550", name: "MSc/MPhil Seminar", credits: 3, category: "mandatory" },
      { code: "GM 473", name: "Computer Applications in Geomatic Engineering", credits: 3, category: "core" },
      { code: "GM 555", name: "Statistical Models", credits: 3, category: "core" },
      { code: "GM 571", name: "Geographic Information Systems", credits: 3, category: "core" },
      { code: "GM 572", name: "Digital Photogrammetry", credits: 3, category: "core" },
      { code: "GM 573", name: "Remote Sensing", credits: 3, category: "core" },
      { code: "GM 578", name: "Global Navigation Satellite Systems", credits: 3, category: "core" },
      { code: "GM 592", name: "Engineering Surveying", credits: 3, category: "core" },
      { code: "GM 554", name: "Mine Economic and Financial Evaluation", credits: 3, category: "elective" },
      { code: "GM 575", name: "Fleet Management", credits: 3, category: "elective" },
    ]
  },
  'Electrical and Electronic Engineering': {
    'MSc': [
      { code: "EL 500", name: "Thesis", credits: 3, category: "mandatory" },
      { code: "EL 551", name: "Research Methods", credits: 3, category: "mandatory" },
      { code: "EL 556", name: "Field/Laboratory Work", credits: 3, category: "mandatory" },
      { code: "EL 560", name: "Engineering Economics", credits: 3, category: "core" },
      { code: "EL 571", name: "Modelling and Simulation", credits: 3, category: "core" },
      { code: "EL 572", name: "Advanced Signal Processing", credits: 3, category: "core" },
      { code: "EL 574", name: "Microprocessor Systems", credits: 3, category: "core" },
      { code: "EL 575", name: "Power System Planning, Protection and Operations", credits: 3, category: "core" },
      { code: "EL 579", name: "Computer Control Systems", credits: 3, category: "core" },
      { code: "EL 586", name: "Mobile Communication Systems", credits: 3, category: "core" },
      { code: "EL 553", name: "Operations Research", credits: 3, category: "elective" },
      { code: "EL 573", name: "Power System Modelling, Stability and Control", credits: 3, category: "elective" },
    ]
  },
  'Mechanical Engineering': {
    'MSc': [
      { code: "MC 551", name: "Research Methods", credits: 3, category: "mandatory" },
      { code: "MC 556", name: "Field/Laboratory Work", credits: 3, category: "mandatory" },
      { code: "MC 533", name: "Operations Research", credits: 3, category: "elective" },
      { code: "MC 562", name: "Engineering Economics", credits: 3, category: "elective" },
      { code: "MC 570", name: "Advanced Manufacturing Processes", credits: 3, category: "elective" },
      { code: "MC 571", name: "Engineering Heat Transfer", credits: 3, category: "elective" },
      { code: "MC 572", name: "Gas Turbines and Fuel Cells", credits: 3, category: "elective" },
    ]
  },
  'Mathematical Sciences': {
    'MSc': [
      { code: "MA 500", name: "Thesis", credits: 3, category: "mandatory" },
      { code: "MA 551", name: "Research Methods", credits: 3, category: "mandatory" },
      { code: "MA 556", name: "Labwork/Fieldwork and Report", credits: 3, category: "mandatory" },
      { code: "MA 275", name: "Numerical Methods", credits: 3, category: "core" },
      { code: "MA 553", name: "Operations Research", credits: 3, category: "core" },
      { code: "MA 571", name: "Numerical Methods for Linear and Nonlinear Equations", credits: 3, category: "core" },
      { code: "MA 573", name: "Time Series and Forecasting", credits: 3, category: "core" },
      { code: "MA 577", name: "Advanced Probability and Statistics", credits: 3, category: "core" },
      { code: "MA 579", name: "Computer Programming", credits: 3, category: "core" },
    ]
  },
  'Mining Engineering': {
    'MSc': [
      { code: "MN 261", name: "Introduction to Mining Engineering", credits: 3, category: "core" },
      { code: "MN 551", name: "Research Methods", credits: 3, category: "mandatory" },
      { code: "MN 553", name: "Operations Research", credits: 3, category: "core" },
      { code: "MN 554", name: "Mine Economic and Financial Evaluation", credits: 3, category: "core" },
      { code: "MN 555", name: "Statistical Models", credits: 3, category: "core" },
      { code: "MN 556", name: "Labwork/Fieldwork and Report", credits: 3, category: "mandatory" },
      { code: "MN 557", name: "Environmental Management", credits: 3, category: "core" },
      { code: "MN 559", name: "Applied Rock Mechanics", credits: 3, category: "core" },
      { code: "MN 563", name: "Data Mining and Advanced Analysis", credits: 3, category: "core" },
    ]
  },
  'Geological Engineering': {
    'MSc': [
      { code: "GL 551", name: "Research Methods", credits: 3, category: "mandatory" },
      { code: "GL 556", name: "Labwork/Fieldwork and Report", credits: 3, category: "mandatory" },
      { code: "GL 553", name: "Operations Research", credits: 3, category: "core" },
      { code: "GL 554", name: "Mine Economic and Financial Evaluation", credits: 3, category: "core" },
      { code: "GL 555", name: "Statistical Models", credits: 3, category: "core" },
      { code: "GL 557", name: "Environmental Management", credits: 3, category: "core" },
      { code: "GL 561", name: "Computer Applications in Geological Engineering", credits: 3, category: "core" },
      { code: "GL 574", name: "Remote Sensing and GIS", credits: 3, category: "core" },
      { code: "GL 579", name: "Applied Artificial Intelligence in Geological Engineering", credits: 3, category: "core" },
    ]
  }
};

async function populateCourses() {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n' + '='.repeat(60));
    console.log('POPULATING COURSES FROM FRONTEND CATALOG');
    console.log('='.repeat(60) + '\n');
    
    // Get all departments
    const deptResult = await client.query('SELECT id, name FROM departments WHERE is_active = TRUE');
    const departments = new Map(deptResult.rows.map(d => [d.name, d.id]));
    
    // Get all programs
    const progResult = await client.query('SELECT id, name, department_id FROM programs WHERE is_active = TRUE');
    const programs = progResult.rows;
    
    let insertCount = 0;
    let skipCount = 0;
    let updateCount = 0;
    
    for (const [deptName, degreeTypes] of Object.entries(COURSE_CATALOGS)) {
      const deptId = departments.get(deptName);
      
      if (!deptId) {
        console.log(`⚠️  Skipping department "${deptName}" - not found in database`);
        continue;
      }
      
      console.log(`\n📚 ${deptName}:`);
      
      for (const [degreeType, courses] of Object.entries(degreeTypes)) {
        // Find matching program
        const program = programs.find(p => 
          p.department_id === deptId && 
          p.name.includes(degreeType)
        );
        
        if (!program) {
          console.log(`   ⚠️  No ${degreeType} program found for ${deptName}`);
          continue;
        }
        
        console.log(`\n   ${degreeType} (Program: ${program.name}):`);
        
        for (const course of courses) {
          // Check if course already exists
          const existing = await client.query(
            'SELECT id, name, credits, course_type FROM courses WHERE code = $1',
            [course.code]
          );
          
          if (existing.rows.length > 0) {
            const existingCourse = existing.rows[0];
            // Update if details differ
            if (existingCourse.name !== course.name || 
                existingCourse.credits !== course.credits ||
                existingCourse.course_type !== course.category) {
              await client.query(
                `UPDATE courses 
                 SET name = $1, credits = $2, course_type = $3, program_id = $4
                 WHERE code = $5`,
                [course.name, course.credits, course.category, program.id, course.code]
              );
              console.log(`      🔄 ${course.code} - ${course.name} (updated)`);
              updateCount++;
            } else {
              console.log(`      ⏭️  ${course.code} - ${course.name} (exists)`);
              skipCount++;
            }
          } else {
            // Insert new course
            await client.query(
              `INSERT INTO courses (code, name, credits, program_id, semester, academic_year, course_type, is_active)
               VALUES ($1, $2, $3, $4, 1, '2025/2026', $5, TRUE)`,
              [course.code, course.name, course.credits, program.id, course.category]
            );
            console.log(`      ✅ ${course.code} - ${course.name} (inserted)`);
            insertCount++;
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully inserted ${insertCount} new courses`);
    console.log(`🔄 Updated ${updateCount} existing courses`);
    console.log(`⏭️  Skipped ${skipCount} unchanged courses`);
    console.log('='.repeat(60));
    
    // Verify final count
    const finalCount = await client.query('SELECT COUNT(*) FROM courses');
    console.log(`\n📊 Total courses in database: ${finalCount.rows[0].count}\n`);
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

populateCourses();
