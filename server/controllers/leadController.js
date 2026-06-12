const Lead     = require("../models/Lead");
const logAudit = require("../middleware/audit");

function scopeFilter(req) {
  return req.user.role === "admin" ? { owner: req.user._id } : {};
}

// GET /api/leads
async function list(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = scopeFilter(req);
    if (status) filter.status = status;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Lead.countDocuments(filter),
    ]);
    res.json({ leads, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

// GET /api/leads/:id
async function getOne(req, res, next) {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, ...scopeFilter(req) })
      .populate("owner", "name email")
      .lean();
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (err) { next(err); }
}

// POST /api/leads
async function create(req, res, next) {
  try {
    const { name, source, status, value } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const lead = await Lead.create({
      name,
      source: source || "other",
      status: status || "new",
      value:  value  || 0,
      owner:  req.user._id,
    });
    logAudit(req, "CREATE", "Lead", lead._id);
    res.status(201).json(lead);
  } catch (err) { next(err); }
}

// PUT /api/leads/:id
async function update(req, res, next) {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, ...scopeFilter(req) });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    ["name", "source", "status", "value"].forEach((f) => {
      if (req.body[f] !== undefined) lead[f] = req.body[f];
    });
    await lead.save();
    logAudit(req, "UPDATE", "Lead", lead._id);
    res.json(lead);
  } catch (err) { next(err); }
}

// DELETE /api/leads/:id
async function remove(req, res, next) {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...scopeFilter(req) });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    logAudit(req, "DELETE", "Lead", lead._id);
    res.json({ message: "Lead deleted" });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
