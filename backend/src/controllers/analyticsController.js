const db = require("../db");

// GET /api/analytics/overview
// Returns high-level statistics
exports.getOverview = async (req, res) => {
  try {
    const { department, academic_year } = req.query;
    
    // Build parameters array once for consistent indexing across all queries
    const buildParams = () => {
      const p = [];
      if (department && department !== "all") p.push(department);
      if (academic_year) p.push(academic_year);
      return p;
    };

    const getDeptFilter = () => {
      if (!department || department === "all") return "";
      const idx = 1;
      return ` AND d.name = $${idx}`;
    };

    const getYearFilter = () => {
      if (!academic_year) return "";
      const yearIdx = (department && department !== "all") ? 2 : 1;
      return ` AND s.admission_year = $${yearIdx}`;
    };

    const params = buildParams();

    // Total students
    const studentsQuery = await db.query(
      `SELECT COUNT(s.id) as total, 
              COUNT(CASE WHEN s.status = 'Active' THEN 1 END) as active
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE 1=1 ${getDeptFilter()} ${getYearFilter()}`,
      params
    );

    // Graduands
    const graduandsQuery = await db.query(
      `SELECT COUNT(CASE WHEN g.status = 'Eligible' THEN 1 END) as eligible,
              COUNT(CASE WHEN g.status = 'Ineligible' THEN 1 END) as ineligible
       FROM graduands g
       JOIN students s ON g.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE 1=1 ${getDeptFilter()} ${getYearFilter()}`,
      params
    );

    // Fees - Updated to use fee_records table with proper NULL handling
    const feesQuery = await db.query(
      `SELECT 
         COALESCE(SUM(fr.amount_paid), 0) as collected,
         COALESCE(SUM(fr.outstanding), 0) as owing,
         COUNT(CASE WHEN fr.is_cleared = true THEN 1 END) as cleared_count,
         COUNT(CASE WHEN fr.status IN ('Pending', 'Partial') THEN 1 END) as owing_count
       FROM fee_records fr
       JOIN students s ON fr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE 1=1 ${getDeptFilter()} ${getYearFilter()}`,
      params
    );

    // Average CWA - Computed from grades if available
    const cwaQuery = await db.query(
      `SELECT COALESCE(AVG(cwa_calc), 0) as avg_cwa
       FROM (
         SELECT ROUND(SUM(g.marks * c.credits)::numeric / NULLIF(SUM(c.credits), 0), 2) as cwa_calc
         FROM students s
         LEFT JOIN grades g ON s.id = g.student_id
         LEFT JOIN courses c ON g.course_id = c.id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE g.marks IS NOT NULL ${getDeptFilter()} ${getYearFilter()}
         GROUP BY s.id
         HAVING SUM(c.credits) > 0
       ) cwa_subquery`,
      params
    );

    // Thesis defended
    const thesisQuery = await db.query(
      `SELECT COALESCE(COUNT(*), 0) as defended
       FROM thesis_submissions t
       JOIN students s ON t.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE t.status = 'Defended' ${getDeptFilter()} ${getYearFilter()}`,
      params
    );

    const students = studentsQuery.rows[0];
    const graduands = graduandsQuery.rows[0] || { eligible: 0, ineligible: 0 };
    const fees = feesQuery.rows[0] || { collected: 0, owing: 0, cleared_count: 0, owing_count: 0 };
    
    const totalFees = parseFloat(fees.collected || 0) + parseFloat(fees.owing || 0);
    const collectionRate = totalFees > 0 ? Math.round((parseFloat(fees.collected || 0) / totalFees) * 100) : 0;

    const overview = {
      total_students: parseInt(students?.total || 0),
      active_students: parseInt(students?.active || 0),
      graduands_eligible: parseInt(graduands?.eligible || 0),
      graduands_ineligible: parseInt(graduands?.ineligible || 0),
      fees_collected: parseFloat(fees?.collected || 0),
      fees_owing: parseFloat(fees?.owing || 0),
      fees_cleared: parseInt(fees?.cleared_count || 0),
      fees_owing_count: parseInt(fees?.owing_count || 0),
      collection_rate: collectionRate,
      avg_cwa: parseFloat(cwaQuery.rows[0]?.avg_cwa || 0).toFixed(1),
      thesis_defended: parseInt(thesisQuery.rows[0]?.defended || 0),
    };

    console.log('Analytics Overview:', overview);
    res.json(overview);
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/enrollment-by-dept
exports.getEnrollmentByDept = async (req, res) => {
  try {
    const { department, academic_year } = req.query;
    let deptFilter = "";
    let yearFilter = "";
    const params = [];

    if (department && department !== "all" && department !== "") {
      deptFilter = " AND d.name = $1";
      params.push(department);
    }

    if (academic_year) {
      const yearIdx = (deptFilter) ? 2 : 1;
      yearFilter = ` AND s.admission_year = $${yearIdx}`;
      params.push(academic_year);
    }

    const result = await db.query(
      `SELECT 
         COALESCE(d.name, 'Unassigned') as department,
         COUNT(s.id) as students,
         COUNT(CASE WHEN u.gender = 'Male' THEN 1 END) as male,
         COUNT(CASE WHEN u.gender = 'Female' THEN 1 END) as female
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id IS NOT NULL ${deptFilter} ${yearFilter}
       GROUP BY d.id, d.name
       ORDER BY students DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/fees-trend
exports.getFeesTrend = async (req, res) => {
  try {
    const { department, period = "6" } = req.query;
    let deptFilter = "";
    const params = [period];

    if (department && department !== "all") {
      deptFilter = " AND d.name = $2";
      params.push(department);
    }

    const result = await db.query(
      `SELECT 
         TO_CHAR(fr.created_at, 'Mon') as month,
         TO_CHAR(fr.created_at, 'YYYY-MM') as period,
         COALESCE(SUM(CASE WHEN fr.status = 'Paid' THEN fr.amount_paid ELSE 0 END), 0) as collected,
         COALESCE(SUM(fr.total_amount), 0) as target
       FROM fee_records fr
       JOIN students s ON fr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE fr.created_at >= NOW() - INTERVAL '1 month' * $1 ${deptFilter}
       GROUP BY TO_CHAR(fr.created_at, 'Mon'), TO_CHAR(fr.created_at, 'YYYY-MM'), DATE_TRUNC('month', fr.created_at)
       ORDER BY DATE_TRUNC('month', fr.created_at)`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/thesis-progress
exports.getThesisProgress = async (req, res) => {
  try {
    const { department } = req.query;
    let deptFilter = "";
    const params = [];

    if (department && department !== "all") {
      deptFilter = " AND d.name = $1";
      params.push(department);
    }

    const result = await db.query(
      `SELECT 
         COALESCE(t.status, 'Not Started') as stage,
         COUNT(*) as value
       FROM students s
       LEFT JOIN thesis_submissions t ON s.id = t.student_id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE 1=1 ${deptFilter}
       GROUP BY t.status
       ORDER BY 
         CASE t.status
           WHEN 'Proposal' THEN 1
           WHEN 'Chapter 1-2' THEN 2
           WHEN 'Chapter 3-4' THEN 3
           WHEN 'Submitted' THEN 4
           WHEN 'Defended' THEN 5
           ELSE 0
         END`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/cwa-distribution
exports.getCWADistribution = async (req, res) => {
  try {
    const { department } = req.query;
    let deptFilter = "";
    const params = [];

    if (department && department !== "all") {
      deptFilter = " AND d.name = $1";
      params.push(department);
    }

    const result = await db.query(
      `SELECT 
         CASE 
           WHEN cwa_val < 50 THEN '< 50'
           WHEN cwa_val >= 50 AND cwa_val < 60 THEN '50-59'
           WHEN cwa_val >= 60 AND cwa_val < 70 THEN '60-69'
           WHEN cwa_val >= 70 AND cwa_val < 80 THEN '70-79'
           WHEN cwa_val >= 80 AND cwa_val < 90 THEN '80-89'
           WHEN cwa_val >= 90 THEN '90+'
         END as range,
         COUNT(*) as count
       FROM (
         SELECT ROUND(SUM(g.marks * c.credits)::numeric / NULLIF(SUM(c.credits), 0), 2) as cwa_val
         FROM students s
         LEFT JOIN grades g ON s.id = g.student_id
         LEFT JOIN courses c ON g.course_id = c.id
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE g.marks IS NOT NULL ${deptFilter}
         GROUP BY s.id
         HAVING SUM(c.credits) > 0
       ) cwa_calc
       GROUP BY range
       ORDER BY 
         CASE range
           WHEN '< 50' THEN 1
           WHEN '50-59' THEN 2
           WHEN '60-69' THEN 3
           WHEN '70-79' THEN 4
           WHEN '80-89' THEN 5
           WHEN '90+' THEN 6
         END`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/program-breakdown
exports.getProgramBreakdown = async (req, res) => {
  try {
    const { department } = req.query;
    let deptFilter = "";
    const params = [];

    if (department && department !== "all") {
      deptFilter = " AND d.name = $1";
      params.push(department);
    }

    const result = await db.query(
      `SELECT 
         COALESCE(p.name, 'Unassigned') as program,
         COUNT(s.id) as value
       FROM students s
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id IS NOT NULL ${deptFilter}
       GROUP BY p.id, p.name
       ORDER BY value DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/enrollment-trend
exports.getEnrollmentTrend = async (req, res) => {
  try {
    const { department } = req.query;
    let deptFilter = "";
    const params = [];

    if (department && department !== "all") {
      deptFilter = " AND d.name = $1";
      params.push(department);
    }

    const result = await db.query(
      `SELECT 
         s.admission_year::text as year,
         COUNT(s.id) as students
       FROM students s
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.admission_year IS NOT NULL ${deptFilter}
       GROUP BY s.admission_year
       ORDER BY s.admission_year`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/counts
exports.getCounts = async (req, res) => {
  try {
    const { department } = req.query;
    let deptFilter = "";
    const params = [];

    if (department && department !== "all" && department !== "") {
      deptFilter = " WHERE d.name = $1";
      params.push(department);
    }

    const deptsQuery = await db.query(
      `SELECT COUNT(*) as count FROM departments d ${deptFilter}`,
      params
    );

    const progQuery = await db.query(
      `SELECT COUNT(*) as count FROM programs p
       LEFT JOIN departments d ON p.department_id = d.id
       ${deptFilter.replace('WHERE', 'WHERE')}`,
      params
    );

    res.json({
      departments: parseInt(deptsQuery.rows[0]?.count || 0),
      programs: parseInt(progQuery.rows[0]?.count || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/analytics/alerts
exports.getAlerts = async (req, res) => {
  try {
    const { department } = req.query;
    let deptFilter = "";
    const params = [];

    if (department && department !== "all") {
      deptFilter = " AND d.name = $1";
      params.push(department);
    }

    const alerts = [];

    // Outstanding fees - Updated to use fee_records
    const feesResult = await db.query(
      `SELECT COUNT(*) as count
       FROM fee_records fr
       JOIN students s ON fr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE fr.status IN ('Pending', 'Partial') ${deptFilter}`,
      params
    );
    const feesCount = parseInt(feesResult.rows[0]?.count || 0);
    if (feesCount > 0) {
      alerts.push({
        text: `${feesCount} student${feesCount > 1 ? "s have" : " has"} outstanding fees`,
        type: "warning",
        link: "/admin/fees",
      });
    }

    // Eligible graduands
    const graduandsResult = await db.query(
      `SELECT COUNT(*) as count
       FROM graduands g
       JOIN students s ON g.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE g.status = 'Eligible' ${deptFilter}`,
      params
    );
    const graduandsCount = parseInt(graduandsResult.rows[0]?.count || 0);
    if (graduandsCount > 0) {
      alerts.push({
        text: `${graduandsCount} student${graduandsCount > 1 ? "s are" : " is"} eligible for graduation`,
        type: "success",
        link: "/admin/passlist",
      });
    }

    // Pending clearances
    const clearanceResult = await db.query(
      `SELECT COUNT(*) as count
       FROM clearance_steps c
       JOIN students s ON c.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE c.status = 'pending' ${deptFilter}`,
      params
    );
    const clearanceCount = parseInt(clearanceResult.rows[0]?.count || 0);
    if (clearanceCount > 0) {
      alerts.push({
        text: `${clearanceCount} clearance request${clearanceCount > 1 ? "s" : ""} pending approval`,
        type: "info",
        link: "/dean/clearance",
      });
    }

    // Pending document requests
    const docsResult = await db.query(
      `SELECT COUNT(*) as count
       FROM document_requests dr
       JOIN students s ON dr.student_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE dr.status = 'Pending' ${deptFilter}`,
      params
    );
    const docsCount = parseInt(docsResult.rows[0]?.count || 0);
    if (docsCount > 0) {
      alerts.push({
        text: `${docsCount} document request${docsCount > 1 ? "s" : ""} awaiting processing`,
        type: "info",
        link: "/admin/documents",
      });
    }

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
