const router = require("express").Router();
const ctrl = require("../controllers/auditController");
const { authenticate, authorize } = require("../middleware/auth");
router.use(authenticate);
router.get("/mine", ctrl.getMine);
router.get("/", authorize("Admin", "Dean", "ViceDean", "Registrar"), ctrl.getAll);
router.post("/", authorize("Admin", "Dean", "ViceDean", "Registrar", "Supervisor", "Accountant", "ExamsOfficer"), ctrl.create);
module.exports = router;