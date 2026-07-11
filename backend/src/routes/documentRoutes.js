const router = require("express").Router();
const ctrl = require("../controllers/documentController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Middleware to set upload subdirectory
const setDocumentSubdir = (req, res, next) => {
  req.uploadSubDir = "documents";
  next();
};

router.use(authenticate);
router.get("/", authorize("Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant"), ctrl.getAll);
router.get("/dean/uploads", authorize("Admin", "Dean", "ViceDean"), ctrl.getDeanUploads);
router.post("/dean/upload", authorize("Admin", "Dean", "ViceDean"), setDocumentSubdir, upload.single("file"), ctrl.uploadForStudents);
router.get("/transcript/:studentId", authorize("Admin", "Dean", "ViceDean"), ctrl.getTranscriptData);
router.post("/:id/complete-transcript", authorize("Admin", "Dean", "ViceDean"), ctrl.completeTranscript);
router.get("/student/:studentId", authorize("Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant", "Student"), ctrl.getByStudent);
router.post("/", authorize("Student"), ctrl.create);
router.put("/:id/status", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant"), ctrl.updateStatus);
module.exports = router;
