const router = require("express").Router();
const ctrl = require("../controllers/supervisorController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

const setResourceSubdir = (req, res, next) => {
  req.uploadSubDir = "supervisor-resources";
  next();
};

router.use(authenticate);
router.get("/current/stats", ctrl.getDashboardStats);
router.get("/current/submissions", ctrl.getCurrentSupervisorSubmissions);
router.get("/", authorize("Admin", "Dean", "ViceDean", "Registrar"), ctrl.getAll);
router.get("/assignments", authorize("Admin", "Dean", "ViceDean", "Registrar"), ctrl.getAllAssignments);
router.get("/:id", authorize("Admin", "Dean", "ViceDean", "Registrar"), ctrl.getById);
router.get("/:id/students", authorize("Admin", "Dean", "ViceDean", "Registrar", "Supervisor"), ctrl.getAssignedStudents);
router.post("/:id/assign", authorize("Admin"), ctrl.assignStudent);
router.delete("/assignments/:assignmentId", authorize("Admin"), ctrl.unassignStudent);

// Resource and announcement endpoints
router.post("/resources/upload", authorize("Supervisor"), setResourceSubdir, upload.single("file"), ctrl.uploadResource);
router.get("/resources", authorize("Supervisor"), ctrl.getResources);
router.delete("/resources/:id", authorize("Supervisor"), ctrl.deleteResource);
router.post("/announcements", authorize("Supervisor"), ctrl.createAnnouncement);
router.get("/announcements", authorize("Supervisor"), ctrl.getAnnouncements);
router.delete("/announcements/:id", authorize("Supervisor"), ctrl.deleteAnnouncement);

module.exports = router;
