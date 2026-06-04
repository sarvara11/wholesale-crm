const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action:   { type: String, required: true },        // e.g. "CREATE", "UPDATE", "DELETE"
    entity:   { type: String, required: true },        // e.g. "Customer", "Lead"
    entityId: { type: mongoose.Schema.Types.ObjectId },
    meta:     { type: mongoose.Schema.Types.Mixed },   // optional before/after snapshot
    timestamp:{ type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Capped at 50 000 entries to control Atlas free-tier storage
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
