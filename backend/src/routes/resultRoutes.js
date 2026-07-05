const router = require("express").Router();
const ctrl = require("../controllers/resultController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(authenticate);
router.get("/cwa-overview", authorize("Dean", "ViceDean", "Admin", "ExamsOfficer"), ctrl.getCWAOverview);
router.get("/student/:studentId", ctrl.getByStudent);
router.get("/cwa/:studentId", ctrl.getCWA);
router.get("/batches", ctrl.getBatches);
router.get("/batches/:id/grades", ctrl.getBatchGrades);
router.post("/parse-grades-file", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), upload.single("file"), ctrl.parseGradesFile);
router.post("/grades/by-index", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.enterGradesByIndex);
router.post("/grades", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.enterGrades);
router.post("/batch-upload", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.batchUpload);
router.delete("/batch/:id", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.deleteBatch);
router.put("/batches/:id/publish", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.publishBatch);
router.delete("/batches/:id", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.deleteBatch);
module.exports = router;
