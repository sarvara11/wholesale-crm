const AuditLog = require("../models/AuditLog");

// GET /api/audit-logs  — manager only
async function list(req, res) {
  const { entity, userId, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (entity) filter.entity = entity;
  if (userId) filter.user   = userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("user", "name email role")
      .sort({ timestamp: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ logs, total, page: Number(page), limit: Number(limit) });
}

module.exports = { list };
