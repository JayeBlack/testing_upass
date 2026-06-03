const router = require("express").Router();
const ctrl = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
router.use(authenticate);
router.get("/", ctrl.getAll);
router.put("/:id/toggle", ctrl.toggle);
router.delete("/:id", ctrl.remove);
module.exports = router;
