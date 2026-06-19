const router = require("express").Router();
const ctrl = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");
router.use(authenticate);
router.get("/", authorize("Admin"), ctrl.getAll);
router.put("/:id/toggle", authorize("Admin"), ctrl.toggle);
router.delete("/:id", authorize("Admin"), ctrl.remove);
module.exports = router;
