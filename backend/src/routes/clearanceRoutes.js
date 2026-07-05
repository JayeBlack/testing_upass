const router = require("express").Router();
const ctrl = require("../controllers/clearanceController");
const { authenticate, authorize } = require("../middleware/auth");

const STAFF = ["Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant", "Accountant", "AccountingAssistant", "ExamsOfficer", "Supervisor"];

router.use(authenticate);
router.get("/student/:studentId", ctrl.getByStudent);
router.get("/supervisor/pending", authorize("Supervisor"), ctrl.getSupervisorPending);
router.get("/all-students", authorize(...STAFF), ctrl.getAllStudents);
router.get("/pending", authorize(...STAFF), ctrl.getPending);
router.put("/:id/approve", authorize(...STAFF), ctrl.approve);
router.put("/:id/reject", authorize(...STAFF), ctrl.reject);
router.post("/bulk-approve", authorize(...STAFF), ctrl.bulkApprove);
router.post("/apply/:studentId", authorize("Student"), ctrl.applyForClearance);
router.post("/init/:studentId", authorize("Admin", "Student"), ctrl.initSteps);
module.exports = router;
