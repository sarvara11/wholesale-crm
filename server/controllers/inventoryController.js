const InventoryItem = require("../models/InventoryItem");
const logAudit      = require("../middleware/audit");

// GET /api/inventory
async function list(req, res, next) {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search)   filter.$or = [
      { productName: new RegExp(search, "i") },
      { sku:         new RegExp(search, "i") },
    ];

    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .sort({ productName: 1 })
        .skip((page - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      InventoryItem.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

// GET /api/inventory/:id
async function getOne(req, res, next) {
  try {
    const item = await InventoryItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) { next(err); }
}

// POST /api/inventory
async function create(req, res, next) {
  try {
    const { sku, productName, category, quantity, price } = req.body;
    if (!sku || !productName || price === undefined)
      return res.status(400).json({ error: "sku, productName, and price are required" });

    const item = await InventoryItem.create({ sku, productName, category, quantity, price });
    logAudit(req, "CREATE", "InventoryItem", item._id);
    res.status(201).json(item);
  } catch (err) { next(err); }
}

// PUT /api/inventory/:id
async function update(req, res, next) {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    ["sku", "productName", "category", "quantity", "price"].forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
    await item.save();
    logAudit(req, "UPDATE", "InventoryItem", item._id);
    res.json(item);
  } catch (err) { next(err); }
}

// DELETE /api/inventory/:id
async function remove(req, res, next) {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    logAudit(req, "DELETE", "InventoryItem", item._id);
    res.json({ message: "Item deleted" });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
