const router = require("express").Router();
const ctrl = require("../controllers/feeController");
const { authenticate, authorize } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.get("/student/:studentId", ctrl.getByStudent);
router.get("/", authorize("Admin", "Accountant", "AccountingAssistant", "Dean", "ViceDean", "ExamsOfficer"), ctrl.getAll);
router.get("/summary", authorize("Admin", "Accountant", "AccountingAssistant", "Dean", "ViceDean"), ctrl.getSummary);
router.post("/payment", ctrl.makePayment);
router.put("/:id/clearance", authorize("Admin", "Accountant", "AccountingAssistant"), ctrl.toggleClearance);
router.post("/parse-bulk", authorize("Admin", "Accountant", "AccountingAssistant"), upload.single("file"), ctrl.parseBulk);
router.post("/upload-bulk", authorize("Admin", "Accountant", "AccountingAssistant"), ctrl.uploadBulk);
module.exports = router;
