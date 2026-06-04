const Opportunity = require("../models/Opportunity");
const logAudit    = require("../middleware/audit");

function scopeFilter(req) {
  return req.user.role === "admin" ? { owner: req.user._id } : {};
}

// GET /api/opportunities
async function list(req, res) {
  const { stage, page = 1, limit = 20 } = req.query;
  const filter = scopeFilter(req);
  if (stage) filter.stage = stage;

  const [opps, total] = await Promise.all([
    Opportunity.find(filter)
      .populate("customer", "name company")
      .populate("owner",    "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Opportunity.countDocuments(filter),
  ]);
  res.json({ opportunities: opps, total, page: Number(page), limit: Number(limit) });
}

// GET /api/opportunities/:id
async function getOne(req, res) {
  const opp = await Opportunity.findOne({ _id: req.params.id, ...scopeFilter(req) })
    .populate("customer", "name company email")
    .populate("owner",    "name email")
    .lean();
  if (!opp) return res.status(404).json({ error: "Opportunity not found" });
  res.json(opp);
}

// POST /api/opportunities
async function create(req, res) {
  const { title, customer, stage, amount } = req.body;
  if (!title || !customer) return res.status(400).json({ error: "title and customer are required" });

  const opp = await Opportunity.create({
    title,
    customer,
    stage:  stage  || "prospecting",
    amount: amount || 0,
    owner:  req.user._id,
  });
  logAudit(req, "CREATE", "Opportunity", opp._id);
  res.status(201).json(opp);
}

// PUT /api/opportunities/:id
async function update(req, res) {
  const opp = await Opportunity.findOne({ _id: req.params.id, ...scopeFilter(req) });
  if (!opp) return res.status(404).json({ error: "Opportunity not found" });

  ["title", "customer", "stage", "amount"].forEach((f) => {
    if (req.body[f] !== undefined) opp[f] = req.body[f];
  });
  await opp.save();
  logAudit(req, "UPDATE", "Opportunity", opp._id);
  res.json(opp);
}

// DELETE /api/opportunities/:id
async function remove(req, res) {
  const opp = await Opportunity.findOneAndDelete({ _id: req.params.id, ...scopeFilter(req) });
  if (!opp) return res.status(404).json({ error: "Opportunity not found" });
  logAudit(req, "DELETE", "Opportunity", opp._id);
  res.json({ message: "Opportunity deleted" });
}

module.exports = { list, getOne, create, update, remove };
