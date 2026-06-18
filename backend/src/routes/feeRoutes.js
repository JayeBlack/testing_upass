const router = require("express").Router();
const ctrl = require("../controllers/feeController");
const { authenticate, authorize } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.get("/student/:studentId", ctrl.getByStudent);
router.get("/", authorize("Admin", "Accountant", "AccountingAssistant", "Dean", "ViceDean", "ExamsOfficer", "Registrar", "AdminAssistant"), ctrl.getAll);
router.get("/summary", authorize("Admin", "Accountant", "AccountingAssistant", "Dean", "ViceDean", "ExamsOfficer", "Registrar", "AdminAssistant"), ctrl.getSummary);
router.post("/payment", ctrl.makePayment);
router.put("/:id/clearance", authorize("Accountant", "AccountingAssistant"), ctrl.toggleClearance);
router.post("/parse-bulk", authorize("Accountant", "AccountingAssistant"), upload.single("file"), ctrl.parseBulk);
router.post("/upload-bulk", authorize("Accountant", "AccountingAssistant"), ctrl.uploadBulk);
module.exports = router;
