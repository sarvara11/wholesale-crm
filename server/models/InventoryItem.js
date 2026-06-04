const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    sku:         { type: String, required: true, unique: true, trim: true, uppercase: true },
    productName: { type: String, required: true, trim: true },
    category:    { type: String, trim: true },
    quantity:    { type: Number, required: true, min: 0, default: 0 },
    price:       { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ category: 1 });

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
