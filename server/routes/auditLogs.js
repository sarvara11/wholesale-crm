const router = require("express").Router();
const auth   = require("../middleware/auth");
const role   = require("../middleware/rbac");
const c      = require("../controllers/auditLogController");

router.get("/", auth, role("manager"), c.list);

module.exports = router;
