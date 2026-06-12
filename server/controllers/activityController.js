const Activity = require("../models/Activity");
const logAudit  = require("../middleware/audit");

function scopeFilter(req) {
  return req.user.role === "admin" ? { owner: req.user._id } : {};
}

// GET /api/activities
async function list(req, res, next) {
  try {
    const { completed, type, page = 1, limit = 20 } = req.query;
    const filter = scopeFilter(req);
    if (completed !== undefined) filter.completed = completed === "true";
    if (type)                    filter.type = type;

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate("owner",     "name email")
        .populate("relatedTo")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip((page - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Activity.countDocuments(filter),
    ]);
    res.json({ activities, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

// GET /api/activities/:id
async function getOne(req, res, next) {
  try {
    const act = await Activity.findOne({ _id: req.params.id, ...scopeFilter(req) })
      .populate("owner",     "name email")
      .populate("relatedTo")
      .lean();
    if (!act) return res.status(404).json({ error: "Activity not found" });
    res.json(act);
  } catch (err) { next(err); }
}

// POST /api/activities
async function create(req, res, next) {
  try {
    const { type, note, relatedTo, relatedModel, dueDate } = req.body;
    if (!type) return res.status(400).json({ error: "type is required" });

    const act = await Activity.create({
      type, note, relatedTo, relatedModel,
      dueDate:   dueDate || null,
      completed: false,
      owner:     req.user._id,
    });
    logAudit(req, "CREATE", "Activity", act._id);
    res.status(201).json(act);
  } catch (err) { next(err); }
}

// PUT /api/activities/:id
async function update(req, res, next) {
  try {
    const act = await Activity.findOne({ _id: req.params.id, ...scopeFilter(req) });
    if (!act) return res.status(404).json({ error: "Activity not found" });

    ["type", "note", "relatedTo", "relatedModel", "dueDate", "completed"].forEach((f) => {
      if (req.body[f] !== undefined) act[f] = req.body[f];
    });
    await act.save();
    logAudit(req, "UPDATE", "Activity", act._id);
    res.json(act);
  } catch (err) { next(err); }
}

// PATCH /api/activities/:id/complete
async function complete(req, res, next) {
  try {
    const act = await Activity.findOneAndUpdate(
      { _id: req.params.id, ...scopeFilter(req) },
      { completed: true },
      { new: true }
    );
    if (!act) return res.status(404).json({ error: "Activity not found" });
    logAudit(req, "COMPLETE", "Activity", act._id);
    res.json(act);
  } catch (err) { next(err); }
}

// DELETE /api/activities/:id
async function remove(req, res, next) {
  try {
    const act = await Activity.findOneAndDelete({ _id: req.params.id, ...scopeFilter(req) });
    if (!act) return res.status(404).json({ error: "Activity not found" });
    logAudit(req, "DELETE", "Activity", act._id);
    res.json({ message: "Activity deleted" });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, complete, remove };
