const router = require("express").Router();
const ctrl = require("../controllers/programController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);
router.get("/", ctrl.getAll);

module.exports = router;
