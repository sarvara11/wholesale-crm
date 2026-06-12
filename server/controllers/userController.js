const bcrypt   = require("bcryptjs");
const User     = require("../models/User");
const logAudit = require("../middleware/audit");

// GET /api/users
async function list(req, res, next) {
  try {
    const users = await User.find().select("-passwordHash").lean();
    res.json(users);
  } catch (err) { next(err); }
}

// GET /api/users/:id
async function getOne(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
}

// POST /api/users
async function create(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "name, email, password, role are required" });
    if (!["manager", "admin"].includes(role))
      return res.status(400).json({ error: "role must be manager or admin" });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role });

    logAudit(req, "CREATE", "User", user._id);
    res.status(201).json(user);
  } catch (err) { next(err); }
}

// PUT /api/users/:id
async function update(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name)  user.name  = name;
    if (email) user.email = email.toLowerCase().trim();
    if (role)  {
      if (!["manager", "admin"].includes(role))
        return res.status(400).json({ error: "role must be manager or admin" });
      user.role = role;
    }
    if (password) user.passwordHash = await bcrypt.hash(password, 12);

    await user.save();
    logAudit(req, "UPDATE", "User", user._id);
    res.json(user);
  } catch (err) { next(err); }
}

// DELETE /api/users/:id
async function remove(req, res, next) {
  try {
    if (req.params.id === String(req.user._id))
      return res.status(400).json({ error: "Cannot delete your own account" });

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    logAudit(req, "DELETE", "User", user._id);
    res.json({ message: "User deleted" });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
