const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    company:    { type: String, trim: true },
    email:      { type: String, lowercase: true, trim: true },
    phone:      { type: String, trim: true },
    status:     { type: String, enum: ["active", "inactive", "prospect"], default: "prospect" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

customerSchema.index({ assignedTo: 1 });
customerSchema.index({ status: 1 });

module.exports = mongoose.model("Customer", customerSchema);
