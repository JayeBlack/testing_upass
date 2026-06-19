const router = require("express").Router();
const ctrl = require("../controllers/studentController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
router.use(authenticate);
router.get("/me", ctrl.getMyProfile); // Must be before /:id to avoid conflict
router.post("/parse-bulk", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant"), upload.single("file"), ctrl.parseBulk);
router.post("/enroll-bulk", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant"), ctrl.enrollBulk);
router.post("/enroll", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant"), ctrl.enroll);
router.get("/", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant", "ExamsOfficer", "Student"), ctrl.getAll);
router.get("/:id", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant", "ExamsOfficer"), ctrl.getById);
router.post("/", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant"), ctrl.create);
router.put("/:id", authorize("Admin", "Dean", "ViceDean", "Registrar", "AssistantRegistrar", "AdminAssistant"), ctrl.update);
router.delete("/:id", authorize("Admin"), ctrl.remove);
module.exports = router;
