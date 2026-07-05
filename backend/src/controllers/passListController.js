const db = require("../db");

// GET /api/passlist
exports.getAll = async (req, res) => {
  try {
    const { department, program, year, status } = req.query;
    let sql = `
      SELECT g.*, s.index_number, u.first_name, u.last_name,
             p.name AS program_name, d.name AS department_name
      FROM graduands g
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (department) { sql += ` AND d.name = $${idx++}`; params.push(department); }
    if (program) { sql += ` AND p.name = $${idx++}`; params.push(program); }
    if (year) { sql += ` AND g.academic_year = $${idx++}`; params.push(year); }
    if (status) { sql += ` AND g.status = $${idx++}`; params.push(status); }
    sql += " ORDER BY u.last_name";
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/passlist/generate
exports.generate = async (req, res) => {
  try {
    const { academic_year, min_cwa } = req.body;
    const year = academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const minCwa = parseFloat(min_cwa) || 50;
    
    console.log(`Generating pass list for ${year} with min CWA: ${minCwa}`);
    
    // Check if there are grades to process
    const gradeCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM grades g
      INNER JOIN students s ON g.student_id = s.id
      WHERE g.marks IS NOT NULL AND g.marks > 0
    `);
    
    const gradeCount = parseInt(gradeCheck.rows[0].count);
    console.log(`Found ${gradeCount} grade records`);
    
    if (gradeCount === 0) {
      return res.status(400).json({ 
        error: "No grades found",
        message: "Cannot generate pass list without grades. Please upload grades first via Exams Officer > Grade Entry."
      });
    }
    
    // Delete existing graduands for this academic year to regenerate fresh
    const deleteResult = await db.query(`DELETE FROM graduands WHERE academic_year = $1`, [year]);
    console.log(`Deleted ${deleteResult.rowCount} existing graduands for ${year}`);
    
    // Auto-generate pass list from grades
    const result = await db.query(`
      INSERT INTO graduands (student_id, academic_year, cwa, status)
      SELECT s.id, $1,
             ROUND(SUM(g.marks * c.credits) / NULLIF(SUM(c.credits), 0), 2) as calculated_cwa,
             CASE 
               WHEN ROUND(SUM(g.marks * c.credits) / NULLIF(SUM(c.credits), 0), 2) >= $2 THEN 'Eligible' 
               ELSE 'Ineligible' 
             END as eligibility_status
      FROM students s
      INNER JOIN grades g ON g.student_id = s.id
      INNER JOIN courses c ON g.course_id = c.id
      WHERE s.status = 'Active' AND g.marks IS NOT NULL AND g.marks > 0 AND c.credits > 0
      GROUP BY s.id
      HAVING COUNT(g.id) > 0 AND SUM(c.credits) > 0
      RETURNING *
    `, [year, minCwa]);

    const eligible = result.rows.filter(r => r.status === 'Eligible').length;
    const ineligible = result.rows.filter(r => r.status === 'Ineligible').length;

    console.log(`Generated: ${eligible} eligible, ${ineligible} ineligible`);

    res.json({ 
      message: `Pass list generated: ${eligible} eligible, ${ineligible} ineligible (${result.rows.length} total)`,
      data: {
        total: result.rows.length,
        eligible,
        ineligible,
        academic_year: year,
        min_cwa: minCwa
      }
    });
  } catch (err) {
    console.error('Pass list generation error:', err);
    res.status(500).json({ error: err.message });
  }
};
