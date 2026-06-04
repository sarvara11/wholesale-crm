const AuditLog = require("../models/AuditLog");

/**
 * logAudit(req, action, entity, entityId, meta?)
 * Fire-and-forget — never blocks the response.
 */
function logAudit(req, action, entity, entityId, meta) {
  AuditLog.create({
    user:     req.user._id,
    action,
    entity,
    entityId: entityId || null,
    meta:     meta || null,
  }).catch((e) => console.error("Audit log error:", e.message));
}

module.exports = logAudit;
