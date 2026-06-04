const router = require("express").Router();
const auth   = require("../middleware/auth");
const role   = require("../middleware/rbac");
const c      = require("../controllers/customerController");

const any = [auth, role("manager", "admin")];
const mgr = [auth, role("manager")];

router.get   ("/",           ...any, c.list);
router.get   ("/:id",        ...any, c.getOne);
router.post  ("/",           ...any, c.create);
router.put   ("/:id",        ...any, c.update);
router.delete("/:id",        ...any, c.remove);
router.patch ("/:id/assign", ...mgr, c.assign);

module.exports = router;
