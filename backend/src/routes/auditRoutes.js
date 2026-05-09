const router = require("express").Router();
const ctrl = require("../controllers/auditController");
const { authenticate, authorize } = require("../middleware/auth");
router.use(authenticate);
router.get("/", authorize("Admin", "Dean", "ViceDean", "Registrar"), ctrl.getAll);
router.post("/", ctrl.create);
module.exports = router;