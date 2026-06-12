const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");
const logAudit = require("../middleware/audit");

// ── Cookie options ─────────────────────────────────────────────────────────────
function cookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.cookie("token", token, cookieOptions());

    req.user = user;
    logAudit(req, "LOGIN", "User", user._id);

    return res.json({
      user: {
        _id:  user._id,
        name: user.name,
        email:user.email,
        role: user.role,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie("token", cookieOptions());
  return res.json({ message: "Logged out" });
}

// GET /api/auth/me  (requires authenticate middleware)
function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, logout, me };
