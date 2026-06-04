const router      = require("express").Router();
const auth        = require("../middleware/auth");
const role        = require("../middleware/rbac");
const c           = require("../controllers/userController");

const managerOnly = [auth, role("manager")];

router.get   ("/",    ...managerOnly, c.list);
router.get   ("/:id", ...managerOnly, c.getOne);
router.post  ("/",    ...managerOnly, c.create);
router.put   ("/:id", ...managerOnly, c.update);
router.delete("/:id", ...managerOnly, c.remove);

module.exports = router;
