const router = require("express").Router();
const auth   = require("../middleware/auth");
const role   = require("../middleware/rbac");
const c      = require("../controllers/reportController");

const any = [auth, role("manager", "admin")];
const mgr = [auth, role("manager")];

router.get("/manager-dashboard", ...mgr, c.managerDashboard);
router.get("/admin-dashboard",   ...any, c.adminDashboard);
router.get("/sales-pipeline",    ...any, c.salesPipeline);
router.get("/lead-sources",      ...any, c.leadSources);
router.get("/revenue-trend",     ...mgr, c.revenueTrend);

module.exports = router;
