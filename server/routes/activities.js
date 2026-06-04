const router = require("express").Router();
const auth   = require("../middleware/auth");
const role   = require("../middleware/rbac");
const c      = require("../controllers/activityController");

const any = [auth, role("manager", "admin")];

router.get   ("/",             ...any, c.list);
router.get   ("/:id",          ...any, c.getOne);
router.post  ("/",             ...any, c.create);
router.put   ("/:id",          ...any, c.update);
router.patch ("/:id/complete", ...any, c.complete);
router.delete("/:id",          ...any, c.remove);

module.exports = router;
