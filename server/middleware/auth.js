const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authenticate(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.sub).select("-passwordHash").lean();
    if (!user)    return res.status(401).json({ error: "User no longer exists" });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "Session expired — please log in again" });
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = authenticate;
