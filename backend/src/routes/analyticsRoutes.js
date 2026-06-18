const router = require("express").Router();
const ctrl = require("../controllers/analyticsController");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);

// All analytics endpoints require admin-level access
const adminRoles = ["Admin", "Dean", "ViceDean", "ExamsOfficer", "Registrar", "AdminAssistant"];

router.get("/overview", authorize(...adminRoles), ctrl.getOverview);
router.get("/enrollment-by-dept", authorize(...adminRoles), ctrl.getEnrollmentByDept);
router.get("/fees-trend", authorize(...adminRoles), ctrl.getFeesTrend);
router.get("/thesis-progress", authorize(...adminRoles), ctrl.getThesisProgress);
router.get("/cwa-distribution", authorize(...adminRoles), ctrl.getCWADistribution);
router.get("/program-breakdown", authorize(...adminRoles), ctrl.getProgramBreakdown);
router.get("/enrollment-trend", authorize(...adminRoles), ctrl.getEnrollmentTrend);
router.get("/counts", authorize(...adminRoles), ctrl.getCounts);
router.get("/alerts", authorize(...adminRoles), ctrl.getAlerts);

module.exports = router;
