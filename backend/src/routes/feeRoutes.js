const router = require("express").Router();
const ctrl = require("../controllers/feeController");
const { authenticate, authorize } = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/download-schedule", ctrl.downloadSchedule); // Public — Cloudinary allowlist enforced in controller
router.use(authenticate);
router.get("/student/:studentId", ctrl.getByStudent);
router.get("/", ctrl.getAll); // All authenticated users can view fees
router.get("/summary", ctrl.getSummary); // All authenticated users can view summary
router.get("/filter-options", ctrl.getFilterOptions); // Distinct years/departments for filters
router.get("/charts", ctrl.getCharts); // Chart data for analytics
router.post("/payment", authorize("Accountant", "AccountingAssistant"), ctrl.makePayment);
router.put("/:id/clearance", authorize("Accountant", "AccountingAssistant"), ctrl.toggleClearance);
router.post("/save-schedule", authorize("Accountant", "AccountingAssistant"), upload.single("file"), ctrl.saveSchedule);
router.post("/parse-fee-schedule", authorize("Accountant", "AccountingAssistant"), upload.single("file"), ctrl.parseFeeSchedule);
router.post("/parse-bulk", authorize("Accountant", "AccountingAssistant"), upload.single("file"), ctrl.parseBulk);
router.post("/upload-bulk", authorize("Accountant", "AccountingAssistant"), ctrl.uploadBulk);
module.exports = router;