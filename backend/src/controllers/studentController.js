const db = require("../db");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

// Helper function to generate program code from name
function generateProgramCode(name) {
  // Convert to uppercase, remove special chars, keep only alphanumeric
  let code = name.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
  
  // Special handling for degree types
  let degreePrefix = '';
  if (code.startsWith('MSC ')) {
    degreePrefix = 'MSC-';
    code = code.substring(4);
  } else if (code.startsWith('MPHIL ')) {
    degreePrefix = 'MPHL-';
    code = code.substring(6);
  } else if (code.startsWith('PHD ')) {
    degreePrefix = 'PHD-';
    code = code.substring(4);
  }
  
  // Remove common words
  const words = code.split(" ").filter(w => !['AND', 'OF', 'THE'].includes(w));
  
  // Take first letters of each word, up to 8 chars total
  if (words.length > 1) {
    code = words.map(w => w[0]).join("");
  } else {
    code = words[0] || "PROG";
  }
  
  // Add timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString().slice(-4);
  return degreePrefix + code.substring(0, 6) + timestamp;
}

// ─── Department Aliases (matches database departments) ────────────────────────────────
const DEPARTMENT_ALIASES = {
  "Computer Science and Engineering": ["Computer Science and Engineering", "Computer Science", "CSE", "CS"],
  "Electrical and Electronic Engineering": ["Electrical and Electronic Engineering", "Electrical Engineering", "Electronic Engineering", "EEE"],
  "Mathematical Sciences": ["Mathematical Sciences", "Mathematics", "Maths", "Math"],
  "Geomatic Engineering": ["Geomatic Engineering", "Geomatics"],
  "Mechanical Engineering": ["Mechanical Engineering", "Mechanical"],
  "Mining Engineering": ["Mining Engineering", "Mining"],
  "Geological Engineering": ["Geological Engineering", "Geology", "Geological"],
  "Minerals Engineering": ["Minerals Engineering", "Mineral Engineering"],
  "Petroleum Engineering": ["Petroleum Engineering", "Petroleum"],
  "Petroleum Refining and Petrochemical Engineering": ["Petroleum Refining and Petrochemical Engineering", "Petroleum Refining"],
  "Management Studies": ["Management Studies", "Management"],
  "Environmental and Safety Engineering": ["Environmental and Safety Engineering", "Environmental Engineering", "Safety Engineering"],
};

function getCanonicalDepartment(department) {
  const normalized = (department || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [canonical, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    for (const alias of aliases) {
      if (alias.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) {
        return canonical;
      }
    }
  }
  return department;
}

// ─── Programme course catalog (mirrors src/data/programmeCourses.ts) ───────
// Maps department+admissionCycle → core/mandatory courses to auto-register.
const PROGRAMME_COURSES = {
  "Mining Engineering": {
    July: [
      { code: "MN 261",    name: "Introduction to Mining Engineering",        credits: 3, type: "core" },
      { code: "MN 551",    name: "Research Methods",                           credits: 3, type: "mandatory" },
      { code: "MN 553",    name: "Operations Research",                        credits: 3, type: "core" },
      { code: "MN 554",    name: "Mine Economic and Financial Evaluation",     credits: 3, type: "core" },
      { code: "MN 555",    name: "Statistical Models",                         credits: 3, type: "core" },
      { code: "MN 556",    name: "Labwork/Fieldwork and Report",               credits: 3, type: "mandatory" },
      { code: "MN 557",    name: "Environmental Management",                   credits: 3, type: "core" },
      { code: "MN 559",    name: "Applied Rock Mechanics",                     credits: 3, type: "core" },
      { code: "MN 563",    name: "Data Mining and Advanced Analysis",          credits: 3, type: "core" },
      { code: "MN 655",    name: "Individual Studies",                         credits: 3, type: "mandatory" },
      { code: "MN 656",    name: "University Teaching Experience",             credits: 3, type: "mandatory" },
    ],
    January: [
      { code: "MN 261",    name: "Introduction to Mining Engineering",        credits: 3, type: "core" },
      { code: "MN 551",    name: "Research Methods",                           credits: 3, type: "mandatory" },
      { code: "MN 553",    name: "Operations Research",                        credits: 3, type: "core" },
      { code: "MN 554",    name: "Mine Economic and Financial Evaluation",     credits: 3, type: "core" },
      { code: "MN 555",    name: "Statistical Models",                         credits: 3, type: "core" },
      { code: "MN 556",    name: "Labwork/Fieldwork and Report",               credits: 3, type: "mandatory" },
      { code: "MN 557",    name: "Environmental Management",                   credits: 3, type: "core" },
      { code: "MN 559",    name: "Applied Rock Mechanics",                     credits: 3, type: "core" },
      { code: "MN 563",    name: "Data Mining and Advanced Analysis",          credits: 3, type: "core" },
      { code: "MN 655",    name: "Individual Studies",                         credits: 3, type: "mandatory" },
      { code: "MN 656",    name: "University Teaching Experience",             credits: 3, type: "mandatory" },
    ],
  },
  "Geomatic Engineering": {
    January: [
      { code: "GM 550", name: "MSc/MPhil Seminar",                                          credits: 3, type: "mandatory" },
      { code: "GM 473", name: "Computer Applications in Geomatic Engineering",              credits: 3, type: "core" },
      { code: "GM 555", name: "Statistical Models",                                          credits: 3, type: "core" },
      { code: "GM 571", name: "Geographic Information Systems",                             credits: 3, type: "core" },
      { code: "GM 572", name: "Digital Photogrammetry",                                     credits: 3, type: "core" },
      { code: "GM 573", name: "Remote Sensing",                                             credits: 3, type: "core" },
      { code: "GM 578", name: "Global Navigation Satellite Systems",                        credits: 3, type: "core" },
      { code: "GM 592", name: "Engineering Surveying",                                      credits: 3, type: "core" },
    ],
    July: [
      { code: "GM 550", name: "MSc/MPhil Seminar",                                          credits: 3, type: "mandatory" },
      { code: "GM 473", name: "Computer Applications in Geomatic Engineering",              credits: 3, type: "core" },
      { code: "GM 555", name: "Statistical Models",                                          credits: 3, type: "core" },
      { code: "GM 571", name: "Geographic Information Systems",                             credits: 3, type: "core" },
      { code: "GM 572", name: "Digital Photogrammetry",                                     credits: 3, type: "core" },
      { code: "GM 573", name: "Remote Sensing",                                             credits: 3, type: "core" },
      { code: "GM 578", name: "Global Navigation Satellite Systems",                        credits: 3, type: "core" },
      { code: "GM 592", name: "Engineering Surveying",                                      credits: 3, type: "core" },
    ],
  },
  "Electrical and Electronic Engineering": {
    January: [
      { code: "EL 500", name: "Thesis",                                                      credits: 3, type: "mandatory" },
      { code: "EL 551", name: "Research Methods",                                            credits: 3, type: "mandatory" },
      { code: "EL 556", name: "Field/Laboratory Work",                                      credits: 3, type: "mandatory" },
      { code: "EL 560", name: "Engineering Economics",                                      credits: 3, type: "core" },
      { code: "EL 571", name: "Modelling and Simulation",                                   credits: 3, type: "core" },
      { code: "EL 572", name: "Advanced Signal Processing",                                 credits: 3, type: "core" },
      { code: "EL 574", name: "Microprocessor Systems",                                     credits: 3, type: "core" },
      { code: "EL 575", name: "Power System Planning, Protection and Operations",           credits: 3, type: "core" },
      { code: "EL 579", name: "Computer Control Systems",                                   credits: 3, type: "core" },
      { code: "EL 586", name: "Mobile Communication Systems",                               credits: 3, type: "core" },
    ],
    July: [
      { code: "EL 500", name: "Thesis",                                                      credits: 3, type: "mandatory" },
      { code: "EL 551", name: "Research Methods",                                            credits: 3, type: "mandatory" },
      { code: "EL 556", name: "Field/Laboratory Work",                                      credits: 3, type: "mandatory" },
      { code: "EL 401", name: "MATLAB/Simulink for Engineers",                              credits: 3, type: "core" },
      { code: "EL 403", name: "Introduction to Computer Applications",                      credits: 3, type: "core" },
      { code: "EL 405", name: "Numerical Methods",                                          credits: 3, type: "core" },
      { code: "EL 407", name: "Probability and Statistics for Engineers",                   credits: 3, type: "core" },
      { code: "EL 560", name: "Engineering Economics",                                      credits: 3, type: "core" },
      { code: "EL 571", name: "Modelling and Simulation",                                   credits: 3, type: "core" },
      { code: "EL 572", name: "Advanced Signal Processing",                                 credits: 3, type: "core" },
      { code: "EL 574", name: "Microprocessor Systems",                                     credits: 3, type: "core" },
      { code: "EL 575", name: "Power System Planning, Protection and Operations",           credits: 3, type: "core" },
      { code: "EL 579", name: "Computer Control Systems",                                   credits: 3, type: "core" },
    ],
  },
  "Mechanical Engineering": {
    January: [
      { code: "MC 551", name: "Research Methods",        credits: 3, type: "mandatory" },
      { code: "MC 556", name: "Field/Laboratory Work",   credits: 3, type: "mandatory" },
    ],
    July: [
      { code: "MC 551", name: "Research Methods",        credits: 3, type: "mandatory" },
      { code: "MC 556", name: "Field/Laboratory Work",   credits: 3, type: "mandatory" },
    ],
  },
  "Mathematical Sciences": {
    July: [
      { code: "MA 500", name: "Thesis",                              credits: 3, type: "mandatory" },
      { code: "MA 551", name: "Research Methods",                    credits: 3, type: "mandatory" },
      { code: "MA 553", name: "Operations Research",                 credits: 3, type: "core" },
      { code: "MA 573", name: "Time Series and Forecasting",         credits: 3, type: "core" },
      { code: "MA 275", name: "Numerical Methods",                   credits: 3, type: "core" },
      { code: "MA 579", name: "Computer Programming",               credits: 3, type: "core" },
    ],
    January: [
      { code: "MA 500", name: "Thesis",                              credits: 3, type: "mandatory" },
      { code: "MA 551", name: "Research Methods",                    credits: 3, type: "mandatory" },
      { code: "MA 556", name: "Labwork/Fieldwork and Report",        credits: 3, type: "mandatory" },
      { code: "MA 275", name: "Numerical Methods",                   credits: 3, type: "core" },
      { code: "MA 553", name: "Operations Research",                 credits: 3, type: "core" },
      { code: "MA 571", name: "Numerical Methods for Linear and Nonlinear Equations", credits: 3, type: "core" },
      { code: "MA 573", name: "Time Series and Forecasting",         credits: 3, type: "core" },
      { code: "MA 577", name: "Advanced Probability and Statistics", credits: 3, type: "core" },
      { code: "MA 579", name: "Computer Programming",               credits: 3, type: "core" },
    ],
  },
  "Minerals Engineering": {
    January: [
      { code: "MR 554", name: "Economic and Financial Evaluation",       credits: 3, type: "core" },
      { code: "MR 556", name: "Labwork/Fieldwork and Report",            credits: 3, type: "mandatory" },
      { code: "MR 576", name: "Mineral Process Design and Control",      credits: 3, type: "core" },
      { code: "MR 579", name: "Aqueous Processes in Mineral Engineering", credits: 3, type: "core" },
    ],
    July: [
      { code: "MR 554", name: "Economic and Financial Evaluation",       credits: 3, type: "core" },
      { code: "MR 556", name: "Labwork/Fieldwork and Report",            credits: 3, type: "mandatory" },
      { code: "MR 576", name: "Mineral Process Design and Control",      credits: 3, type: "core" },
      { code: "MR 579", name: "Aqueous Processes in Mineral Engineering", credits: 3, type: "core" },
    ],
  },
  "Geological Engineering": {
    January: [
      { code: "GL 551", name: "Research Methods",                                              credits: 3, type: "mandatory" },
      { code: "GL 556", name: "Labwork/Fieldwork and Report",                                  credits: 3, type: "mandatory" },
      { code: "GL 553", name: "Operations Research",                                           credits: 3, type: "core" },
      { code: "GL 554", name: "Mine Economic and Financial Evaluation",                        credits: 3, type: "core" },
      { code: "GL 555", name: "Statistical Models",                                            credits: 3, type: "core" },
      { code: "GL 557", name: "Environmental Management",                                     credits: 3, type: "core" },
      { code: "GL 561", name: "Computer Applications in Geological Engineering",              credits: 3, type: "core" },
      { code: "GL 574", name: "Remote Sensing and GIS",                                       credits: 3, type: "core" },
      { code: "GL 579", name: "Applied Artificial Intelligence in Geological Engineering",    credits: 3, type: "core" },
    ],
    July: [
      { code: "GL 551", name: "Research Methods",                                              credits: 3, type: "mandatory" },
      { code: "GL 553", name: "Operations Research",                                           credits: 3, type: "core" },
      { code: "GL 554", name: "Mine Economic and Financial Evaluation",                        credits: 3, type: "core" },
      { code: "GL 555", name: "Statistical Models",                                            credits: 3, type: "core" },
      { code: "GL 561", name: "Computer Applications in Geological Engineering",              credits: 3, type: "core" },
      { code: "GL 574", name: "Remote Sensing and GIS",                                       credits: 3, type: "core" },
      { code: "GL 579", name: "Applied Artificial Intelligence in Geological Engineering",    credits: 3, type: "core" },
    ],
  },
  "Petroleum Engineering": {
    January: [
      { code: "PE 500", name: "Thesis",                    credits: 3, type: "mandatory" },
      { code: "PE 550", name: "Graduate Seminar",          credits: 3, type: "mandatory" },
      { code: "PE 556", name: "Labwork/Fieldwork and Report", credits: 3, type: "mandatory" },
    ],
    July: [
      { code: "PE 500", name: "Thesis",                    credits: 3, type: "mandatory" },
      { code: "PE 550", name: "Graduate Seminar",          credits: 3, type: "mandatory" },
      { code: "PE 556", name: "Labwork/Fieldwork and Report", credits: 3, type: "mandatory" },
    ],
  },
  "Computer Science and Engineering": {
    January: [
      { code: "CE 500", name: "MSc Thesis",                  credits: 21, type: "mandatory" },
      { code: "CE 550", name: "MSc Seminar",                 credits: 3,  type: "mandatory" },
      { code: "CE 551", name: "Research Methods",            credits: 3,  type: "mandatory" },
      { code: "CE 556", name: "Field/Laboratory Work",       credits: 3,  type: "mandatory" },
      { code: "CE 571", name: "Very Large Scale Integration (VLSI)", credits: 3, type: "core" },
      { code: "CE 573", name: "Optimisation Methods and Applications", credits: 3, type: "core" },
      { code: "CE 575", name: "Realtime Systems",            credits: 3,  type: "core" },
      { code: "CE 577", name: "Parallel Computing",          credits: 3,  type: "core" },
      { code: "CE 579", name: "Data Mining",                 credits: 3,  type: "core" },
      { code: "CE 589", name: "Information Theory and Coding", credits: 3, type: "core" },
    ],
    July: [
      { code: "CE 500", name: "MSc Thesis",                  credits: 21, type: "mandatory" },
      { code: "CE 550", name: "MSc Seminar",                 credits: 3,  type: "mandatory" },
      { code: "CE 551", name: "Research Methods",            credits: 3,  type: "mandatory" },
      { code: "CE 556", name: "Field/Laboratory Work",       credits: 3,  type: "mandatory" },
      { code: "CE 571", name: "Very Large Scale Integration (VLSI)", credits: 3, type: "core" },
      { code: "CE 573", name: "Optimisation Methods and Applications", credits: 3, type: "core" },
      { code: "CE 575", name: "Realtime Systems",            credits: 3,  type: "core" },
      { code: "CE 577", name: "Parallel Computing",          credits: 3,  type: "core" },
      { code: "CE 579", name: "Data Mining",                 credits: 3,  type: "core" },
      { code: "CE 589", name: "Information Theory and Coding", credits: 3, type: "core" },
    ],
  },
  "Environmental and Safety Engineering": {
    July: [
      { code: "HS 501", name: "Introduction to Occupational Health & Safety Management (prerequisite)", credits: 3, type: "core" },
      { code: "HS 573", name: "Occupational Health & Safety Management Systems", credits: 3, type: "core" },
      { code: "HS 571", name: "Occupational Health & Safety Law and Policy",     credits: 3, type: "core" },
      { code: "HS 551", name: "Research Methods",                                credits: 3, type: "mandatory" },
      { code: "HS 579", name: "Artificial Intelligence in OHS",                  credits: 3, type: "core" },
      { code: "HS 577", name: "Statistical Data Analysis",                       credits: 3, type: "core" },
      { code: "HS 575", name: "Project Management",                              credits: 3, type: "core" },
      { code: "HS 561", name: "Critical Thinking and Decision Making",           credits: 3, type: "core" },
      { code: "HS 559", name: "Field/Lab Work",                                  credits: 3, type: "mandatory" },
      { code: "HS 550", name: "MSc/MPhil Seminar",                               credits: 3, type: "mandatory" },
    ],
    January: [
      { code: "HS 551", name: "Research Methods",   credits: 3, type: "mandatory" },
      { code: "HS 559", name: "Field/Lab Work",      credits: 3, type: "mandatory" },
      { code: "HS 550", name: "MSc/MPhil Seminar",   credits: 3, type: "mandatory" },
    ],
  },
  "Management Studies": {
    July: [
      { code: "MBS 551", name: "Research Methods",                        credits: 3, type: "mandatory" },
      { code: "MBS 571", name: "Management and Organisational Behaviour", credits: 3, type: "core" },
      { code: "MBS 573", name: "Managerial Economics",                    credits: 3, type: "core" },
      { code: "MBS 575", name: "Accounting for Business Decisions",       credits: 3, type: "core" },
      { code: "MBS 577", name: "Quantitative Methods",                    credits: 3, type: "core" },
      { code: "MBS 579", name: "Project and Operations Management",       credits: 3, type: "core" },
      { code: "MBS 581", name: "Business Intelligence and Data Analytics", credits: 3, type: "core" },
      { code: "MBS 583", name: "Management Information Systems",          credits: 3, type: "core" },
      { code: "MBS 589", name: "Strategic Management",                    credits: 3, type: "core" },
    ],
    January: [
      { code: "MBS 551", name: "Research Methods",                        credits: 3, type: "mandatory" },
      { code: "MBS 571", name: "Management and Organisational Behaviour", credits: 3, type: "core" },
      { code: "MBS 573", name: "Managerial Economics",                    credits: 3, type: "core" },
      { code: "MBS 575", name: "Accounting for Business Decisions",       credits: 3, type: "core" },
      { code: "MBS 577", name: "Quantitative Methods",                    credits: 3, type: "core" },
      { code: "MBS 579", name: "Project and Operations Management",       credits: 3, type: "core" },
      { code: "MBS 581", name: "Business Intelligence and Data Analytics", credits: 3, type: "core" },
      { code: "MBS 583", name: "Management Information Systems",          credits: 3, type: "core" },
      { code: "MBS 589", name: "Strategic Management",                    credits: 3, type: "core" },
    ],
  },
};

// Auto-register core/mandatory courses for a newly enrolled student
async function autoRegisterCourses(client, studentId, department, admissionCycle, academicYear) {
  try {
    const cycle = admissionCycle || "January";
    
    // Get canonical department name to handle variations
    const canonicalDept = getCanonicalDepartment(department);
    console.log(`[autoRegisterCourses] Original dept: ${department}, Canonical: ${canonicalDept}`);
    
    // Try canonical department first, then original
    let deptCourses = PROGRAMME_COURSES[canonicalDept] || PROGRAMME_COURSES[department];
    
    if (!deptCourses) {
      console.log(`[autoRegisterCourses] No catalog for department: ${department}`);
      return;
    }
    
    const courses = deptCourses[cycle] || deptCourses["January"] || [];
    if (courses.length === 0) {
      console.log(`[autoRegisterCourses] No courses for cycle: ${cycle}`);
      return;
    }

    console.log(`[autoRegisterCourses] Registering ${courses.length} courses for student ${studentId}`);

    for (const course of courses) {
      // find or create course record
      let courseId;
      const existing = await client.query("SELECT id FROM courses WHERE code = $1", [course.code]);
      if (existing.rows.length > 0) {
        courseId = existing.rows[0].id;
      } else {
        const nc = await client.query(
          `INSERT INTO courses (name, code, credits, semester, academic_year, course_type, is_active)
           VALUES ($1, $2, $3, 1, $4, $5, TRUE) RETURNING id`,
          [course.name, course.code, course.credits, academicYear, course.type]
        );
        courseId = nc.rows[0].id;
      }
      // register student — ignore duplicates
      await client.query(
        `INSERT INTO course_registrations (student_id, course_id, semester, academic_year, status)
         VALUES ($1, $2, 1, $3, 'Registered')
         ON CONFLICT (student_id, course_id, academic_year) DO NOTHING`,
        [studentId, courseId, academicYear]
      );
    }
    console.log(`[autoRegisterCourses] Successfully registered courses for student ${studentId}`);
  } catch (err) {
    // log but don't block enrollment
    console.error("[autoRegisterCourses] Error:", err.message);
  }
}

// GET /api/students/by-user/:userId - Get student by user ID
exports.getByUserId = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
              p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.user_id = $1`,
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/students/me - Get current user's student profile
exports.getMyProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
              p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/students
exports.getAll = async (req, res) => {
  try {
    const { department, status, search, page = '1', limit = '1000' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let sql = `
      SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
             p.name AS program_name, d.name AS department_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (department) { sql += ` AND d.name = $${idx++}`; params.push(department); }
    if (status) { sql += ` AND s.status = $${idx++}`; params.push(status); }
    if (search) {
      sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR s.index_number ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    
    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS count_query`;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].total);
    
    sql += ` ORDER BY u.last_name LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limitNum, offset);

    const result = await db.query(sql, params);
    
    // Return pagination metadata
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/students/:id
exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.avatar_url,
              p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/students (enroll)
exports.create = async (req, res) => {
  try {
    const {
      user_id, index_number, program_id, department_id,
      admission_year, study_mode, admission_cycle,
    } = req.body;
    if (!user_id || !index_number || !program_id || !department_id || !admission_year) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO students (user_id, index_number, program_id, department_id, admission_year, study_mode, admission_cycle)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, index_number, program_id, department_id, admission_year, study_mode || "Full-time", admission_cycle || "January"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Student already exists" });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/students/enroll
// Accepts: { name, email, index, program, department, admission_year, admission_cycle }
// Creates a user (role=Student) and student record; creates program/department if missing
exports.enroll = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, email, index, program, department, admission_year, admission_cycle } = req.body;
    if (!name || !email || !index) return res.status(400).json({ error: "Missing required fields" });

    const [first_name, ...rest] = name.trim().split(/\s+/);
    const last_name = rest.join(" ") || "";
    const defaultPwd = String(index).trim();

    await client.query("BEGIN");

    // ensure email not registered
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(defaultPwd, 10);

    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password, last_password_change)
       VALUES ($1, $2, 'Student', $3, $4, TRUE, NOW())
       RETURNING id, email`,
      [email, hash, first_name, last_name]
    );
    const userId = userInsert.rows[0].id;

    // find or create department FIRST
    let deptId = null;
    if (department) {
      const d = await client.query("SELECT id FROM departments WHERE LOWER(name) = LOWER($1)", [department]);
      if (d.rows.length > 0) deptId = d.rows[0].id;
      else {
        const nd = await client.query("INSERT INTO departments (name, is_active) VALUES ($1, TRUE) RETURNING id", [department]);
        deptId = nd.rows[0].id;
      }
    }

    // find or create program with department_id
    let programId = null;
    if (program) {
      const p = await client.query("SELECT id FROM programs WHERE LOWER(name) = LOWER($1)", [program]);
      if (p.rows.length > 0) programId = p.rows[0].id;
      else {
        const programCode = generateProgramCode(program);
        const np = await client.query("INSERT INTO programs (name, code, department_id, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id", [program, programCode, deptId]);
        programId = np.rows[0].id;
      }
    }

    const admYear = admission_year || new Date().getFullYear();
    const admCycle = admission_cycle || "January";

    const stud = await client.query(
      `INSERT INTO students (user_id, index_number, program_id, department_id, admission_year, admission_cycle)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, index, programId, deptId, admYear, admCycle]
    );

    // fetch full student record with joined names
    const out = await client.query(
      `SELECT s.*, u.first_name, u.last_name, u.email, p.name AS program_name, d.name AS department_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = $1`,
      [stud.rows[0].id]
    );

    // Auto-register core/mandatory courses for the new student
    const academicYear = `${admYear}/${admYear + 1}`;
    await autoRegisterCourses(client, stud.rows[0].id, department, admCycle, academicYear);

    await client.query("COMMIT");
    res.status(201).json({ student: out.rows[0], default_password: defaultPwd });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    if (err.code === "23505") return res.status(409).json({ error: "Student already exists" });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/students/:id
exports.update = async (req, res) => {
  try {
    const { status, study_mode } = req.body;
    const result = await db.query(
      `UPDATE students SET status = COALESCE($1, status), study_mode = COALESCE($2, study_mode), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, study_mode, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/students/:id (hard delete)
exports.remove = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    
    // Get student's user_id before deletion
    const studentQuery = await client.query(
      "SELECT user_id FROM students WHERE id = $1",
      [req.params.id]
    );
    
    if (studentQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Student not found" });
    }
    
    const userId = studentQuery.rows[0].user_id;
    
    // Delete student record first (due to foreign key)
    await client.query("DELETE FROM students WHERE id = $1", [req.params.id]);
    
    // Delete associated user account
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    
    await client.query("COMMIT");
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// POST /api/students/parse-bulk
// Accepts multipart file (CSV or XLSX)
// Returns parsed rows: { rows: [{ name, index, email, program, department }, ...] }
exports.parseBulk = async (req, res) => {
  try {
    console.log('📥 parseBulk called');
    console.log('📎 req.file:', req.file ? 'present' : 'missing');
    
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    console.log('📄 File details:', {
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.buffer ? req.file.buffer.length : 'no buffer'
    });
    
    const { mimetype, buffer } = req.file;
    
    if (!buffer) {
      return res.status(400).json({ error: "File buffer is empty" });
    }
    
    const isExcel = /\.(xlsx?|xls)$|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel/i.test(
      mimetype || req.file.originalname
    );

    console.log('📊 Is Excel file:', isExcel);

    let rows = [];
    if (isExcel) {
      console.log('📖 Reading as Excel...');
      const workbook = XLSX.read(buffer, { type: "buffer" });
      console.log('📚 Workbook sheets:', workbook.SheetNames);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      console.log('✅ Parsed', rows.length, 'rows');
    } else {
      const text = buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      rows = lines.map((line) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else current += ch;
        }
        result.push(current.trim());
        return result;
      });
    }

    console.log('📊 Parsed rows count:', rows.length);
    console.log('📋 First 3 rows:', JSON.stringify(rows.slice(0, 3), null, 2));

    if (rows.length < 2) return res.status(400).json({ error: "File must contain header and at least one row" });

    // map columns
    const headers = rows[0];
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: "Invalid file format: headers not found" });
    }
    
    const normalized = headers.map((h) => h ? String(h).toLowerCase().replace(/[^a-z]/g, "") : "");
    const colMap = {};
    const knownCols = {
      name: ["name", "fullname", "studentname", "student"],
      index: ["index", "indexnumber", "indexno", "studentid", "regno", "regnumber"],
      email: ["email", "emailaddress", "mail"],
      program: ["program", "programme", "course", "programname", "programmename"],
      department: ["department", "dept", "departmentname"],
      cohort: ["cohort", "admissioncycle", "cycle", "intake"],
      academic_year: ["academicyear", "gradyear", "graduationyear", "year"],
    };
    for (const [field, aliases] of Object.entries(knownCols)) {
      const idx = normalized.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }
    if (Object.keys(colMap).length < 2) {
      colMap.name = 0;
      colMap.index = 1;
      colMap.email = 2;
      colMap.program = 3;
      colMap.department = 4;
      colMap.cohort = 5;
      colMap.academic_year = 6;
    }

    // parse rows
    const parsed = rows.slice(1)
      .filter(cols => cols && Array.isArray(cols) && cols.length > 0)
      .map((cols) => {
        const nameIdx = colMap.name ?? 0;
        const indexIdx = colMap.index ?? 1;
        const emailIdx = colMap.email ?? 2;
        const programIdx = colMap.program ?? 3;
        const deptIdx = colMap.department ?? 4;
        const cohortIdx = colMap.cohort ?? 5;
        const academicYearIdx = colMap.academic_year ?? 6;
        
        const cohortVal = (cols[cohortIdx] !== undefined && cols[cohortIdx] !== null) 
          ? String(cols[cohortIdx]).trim().toLowerCase() 
          : "";
        let cohort = "January"; // default
        if (cohortVal.includes("july") || cohortVal.includes("jul") || cohortVal === "2") {
          cohort = "July";
        }
        
        // Parse academic year (optional)
        let academicYear = "";
        if (cols[academicYearIdx] !== undefined && cols[academicYearIdx] !== null) {
          const yearVal = String(cols[academicYearIdx]).trim();
          // Accept formats: "2024/2025", "2024-2025", "24/25", "2024"
          if (yearVal) {
            // Normalize to YYYY/YYYY format
            if (yearVal.match(/^\d{4}[\/\-]\d{4}$/)) {
              academicYear = yearVal.replace("-", "/");
            } else if (yearVal.match(/^\d{2}[\/\-]\d{2}$/)) {
              // Convert 24/25 to 2024/2025
              const [y1, y2] = yearVal.split(/[\/\-]/);
              academicYear = `20${y1}/20${y2}`;
            } else if (yearVal.match(/^\d{4}$/)) {
              // Convert 2024 to 2024/2025
              const year = parseInt(yearVal);
              academicYear = `${year}/${year + 1}`;
            }
          }
        }
        
        return {
          name: (cols[nameIdx] !== undefined && cols[nameIdx] !== null) ? String(cols[nameIdx]).trim() : "",
          index: (cols[indexIdx] !== undefined && cols[indexIdx] !== null) ? String(cols[indexIdx]).trim() : "",
          email: (cols[emailIdx] !== undefined && cols[emailIdx] !== null) ? String(cols[emailIdx]).trim() : "",
          program: (cols[programIdx] !== undefined && cols[programIdx] !== null) ? String(cols[programIdx]).trim() : "",
          department: (cols[deptIdx] !== undefined && cols[deptIdx] !== null) ? String(cols[deptIdx]).trim() : "",
          admission_cycle: cohort,
          academic_year: academicYear,
        };
      })
      .filter((s) => s && s.name && s.index);

    if (parsed.length === 0) {
      return res.status(400).json({ error: "No valid student records found" });
    }

    res.json({ rows: parsed });
  } catch (err) {
    console.error('❌ parseBulk error:', err.message);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/students/enroll-bulk (OPTIMIZED)
// Accepts: { students: [{ name, email, index, program, department, admission_year }, ...] }
// Enrolls multiple students at once
exports.enrollBulk = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "No students to enroll" });
    }

    const enrolled = [];
    const errors = [];
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Pre-fetch all programs and departments (Quick Win #4)
      const progs = await client.query("SELECT id, LOWER(name) as name FROM programs");
      const progMap = {};
      progs.rows.forEach(p => { progMap[p.name] = p.id; });

      const depts = await client.query("SELECT id, LOWER(name) as name FROM departments");
      const deptMap = {};
      depts.rows.forEach(d => { deptMap[d.name] = d.id; });

      // Check existing emails and indexes in bulk
      const emails = students.map(s => s.email?.trim().toLowerCase()).filter(Boolean);
      const indexes = students.map(s => String(s.index || '').trim()).filter(Boolean);
      
      const existingEmailsResult = await client.query(
        "SELECT email FROM users WHERE email = ANY($1)",
        [emails]
      );
      const existingEmails = new Set(existingEmailsResult.rows.map(r => r.email));

      const existingIndexesResult = await client.query(
        "SELECT index_number FROM students WHERE index_number = ANY($1)",
        [indexes]
      );
      const existingIndexes = new Set(existingIndexesResult.rows.map(r => r.index_number));

      // Process students
      for (let i = 0; i < students.length; i++) {
        const { name, email, index, program, department, admission_year, admission_cycle, academic_year } = students[i];
        
        if (!name || !email || !index) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        const emailLower = email.trim().toLowerCase();
        const indexTrimmed = String(index).trim();

        if (existingEmails.has(emailLower)) {
          errors.push(`Row ${i + 1}: Email already registered`);
          continue;
        }

        if (existingIndexes.has(indexTrimmed)) {
          errors.push(`Row ${i + 1}: Index number already exists`);
          continue;
        }

        const [first_name, ...rest] = name.trim().split(/\s+/);
        const last_name = rest.join(" ") || "";
        const defaultPwd = indexTrimmed;

        // Extract admission year from index number (e.g., UMaT/PG/0001/22 -> 2022)
        let admYear = admission_year;
        if (!admYear) {
          const yearMatch = indexTrimmed.match(/\/(\d{2})$/);
          if (yearMatch) {
            const shortYear = parseInt(yearMatch[1]);
            admYear = shortYear >= 0 && shortYear <= 99 ? (shortYear < 50 ? 2000 + shortYear : 1900 + shortYear) : new Date().getFullYear();
          } else {
            admYear = new Date().getFullYear();
          }
        }

        // Calculate academic_year for course registration if not provided
        // Default: admission_year + 2 (typical 2-year MSc program)
        let courseAcademicYear = academic_year;
        if (!courseAcademicYear) {
          const gradYear = parseInt(admYear) + 2;
          courseAcademicYear = `${gradYear}/${gradYear + 1}`;
        }

        try {
          // Quick Win #2: No genSalt needed
          const hash = await bcrypt.hash(defaultPwd, 10);

          const userInsert = await client.query(
            `INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password, last_password_change)
             VALUES ($1, $2, 'Student', $3, $4, TRUE, NOW())
             RETURNING id, email`,
            [emailLower, hash, first_name, last_name]
          );
          const userId = userInsert.rows[0].id;

          // Quick Win #4: Lookup from map - Process department FIRST
          let deptId = null;
          if (department) {
            const deptKey = department.trim().toLowerCase();
            if (deptMap[deptKey]) {
              deptId = deptMap[deptKey];
            } else {
              const nd = await client.query(
                "INSERT INTO departments (name, is_active) VALUES ($1, TRUE) RETURNING id",
                [department]
              );
              deptId = nd.rows[0].id;
              deptMap[deptKey] = deptId;
            }
          }

          // Quick Win #4: Lookup from map - Process program with department_id
          let programId = null;
          if (program) {
            const progKey = program.trim().toLowerCase();
            if (progMap[progKey]) {
              programId = progMap[progKey];
            } else {
              const programCode = generateProgramCode(program);
              const np = await client.query(
                "INSERT INTO programs (name, code, department_id, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id",
                [program, programCode, deptId]
              );
              programId = np.rows[0].id;
              progMap[progKey] = programId;
            }
          }

          const admCycle = admission_cycle || "January";

          const stud = await client.query(
            `INSERT INTO students (user_id, index_number, program_id, department_id, admission_year, admission_cycle)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, indexTrimmed, programId, deptId, admYear, admCycle]
          );

          // fetch full student record
          const out = await client.query(
            `SELECT s.*, u.first_name, u.last_name, u.email, p.name AS program_name, d.name AS department_name
             FROM students s
             JOIN users u ON s.user_id = u.id
             LEFT JOIN programs p ON s.program_id = p.id
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.id = $1`,
            [stud.rows[0].id]
          );

          // Auto-register core/mandatory courses
          await autoRegisterCourses(client, stud.rows[0].id, department, admCycle, courseAcademicYear);

          enrolled.push(out.rows[0]);
          existingEmails.add(emailLower);
          existingIndexes.add(indexTrimmed);
        } catch (err) {
          if (err.code === "23505") {
            errors.push(`Row ${i + 1}: Student already exists`);
          } else {
            errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      }

      // Quick Win #1: Single COMMIT for all students
      await client.query("COMMIT");
      res.status(201).json({ enrolled, errors: errors.length > 0 ? errors : undefined });
      
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
