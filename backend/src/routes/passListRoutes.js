const router = require("express").Router();
const ctrl = require("../controllers/passListController");
const { authenticate, authorize } = require("../middleware/auth");
router.use(authenticate);
router.get("/", authorize("Admin", "Dean", "ViceDean", "Registrar", "ExamsOfficer"), ctrl.getAll);
router.post("/generate", authorize("ExamsOfficer", "Admin", "Dean", "ViceDean"), ctrl.generate);
module.exports = router;
