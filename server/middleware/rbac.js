/**
 * requireRole(...roles)
 * Usage: router.get('/route', authenticate, requireRole('manager'), handler)
 * Pass multiple roles to allow any of them: requireRole('manager', 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden — insufficient role" });
    next();
  };
}

module.exports = requireRole;
