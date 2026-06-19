const router = require("express").Router();
const ctrl = require("../controllers/announcementController");
const { authenticate, authorize } = require("../middleware/auth");
router.use(authenticate);
router.get("/", ctrl.getAll);
router.post("/", authorize("Supervisor", "Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant", "Accountant"), ctrl.create);
router.post("/:id/acknowledge", ctrl.acknowledge);
router.delete("/:id", ctrl.remove);
module.exports = router;
