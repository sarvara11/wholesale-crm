const Customer = require("../models/Customer");
const User     = require("../models/User");
const logAudit = require("../middleware/audit");

// Admins see only their assigned customers; managers see all
function scopeFilter(req) {
  return req.user.role === "admin"
    ? { $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }] }
    : {};
}

// GET /api/customers
async function list(req, res) {
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter = scopeFilter(req);

  if (status) filter.status = status;
  if (search) {
    const re = new RegExp(search, "i");
    filter.$and = [
      Object.keys(filter).length ? filter : {},
      { $or: [{ name: re }, { company: re }, { email: re }] },
    ];
    // rebuild to avoid double $or collision
    const base = scopeFilter(req);
    const searchClause = { $or: [{ name: re }, { company: re }, { email: re }] };
    const combined = Object.keys(base).length
      ? { $and: [base, searchClause] }
      : searchClause;
    return res.json(
      await Customer.find(combined)
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean()
    );
  }

  const customers = await Customer.find(filter)
    .populate("assignedTo", "name email")
    .populate("createdBy",  "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  const total = await Customer.countDocuments(filter);
  res.json({ customers, total, page: Number(page), limit: Number(limit) });
}

// GET /api/customers/:id
async function getOne(req, res) {
  const filter = { _id: req.params.id, ...scopeFilter(req) };
  const customer = await Customer.findOne(filter)
    .populate("assignedTo", "name email")
    .populate("createdBy",  "name email")
    .lean();
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
}

// POST /api/customers
async function create(req, res) {
  const { name, company, email, phone, status, assignedTo } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const customer = await Customer.create({
    name, company, email, phone,
    status:     status || "prospect",
    assignedTo: assignedTo || req.user._id,
    createdBy:  req.user._id,
  });

  logAudit(req, "CREATE", "Customer", customer._id);
  res.status(201).json(customer);
}

// PUT /api/customers/:id
async function update(req, res) {
  const filter = { _id: req.params.id, ...scopeFilter(req) };
  const customer = await Customer.findOne(filter);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const fields = ["name", "company", "email", "phone", "status"];
  fields.forEach((f) => { if (req.body[f] !== undefined) customer[f] = req.body[f]; });

  // Only managers can re-assign customers
  if (req.body.assignedTo && req.user.role === "manager")
    customer.assignedTo = req.body.assignedTo;

  await customer.save();
  logAudit(req, "UPDATE", "Customer", customer._id);
  res.json(customer);
}

// DELETE /api/customers/:id
async function remove(req, res) {
  const filter = { _id: req.params.id, ...scopeFilter(req) };
  const customer = await Customer.findOneAndDelete(filter);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  logAudit(req, "DELETE", "Customer", customer._id);
  res.json({ message: "Customer deleted" });
}

// PATCH /api/customers/:id/assign  — manager only
async function assign(req, res) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const [customer, user] = await Promise.all([
    Customer.findById(req.params.id),
    User.findById(userId),
  ]);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  if (!user)     return res.status(404).json({ error: "User not found" });

  customer.assignedTo = userId;
  await customer.save();
  logAudit(req, "ASSIGN", "Customer", customer._id, { assignedTo: userId });
  res.json(customer);
}

module.exports = { list, getOne, create, update, remove, assign };
