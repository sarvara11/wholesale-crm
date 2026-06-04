const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["website", "referral", "trade_show", "cold_call", "social_media", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "lost"],
      default: "new",
    },
    value: { type: Number, default: 0, min: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

leadSchema.index({ owner: 1 });
leadSchema.index({ status: 1 });

module.exports = mongoose.model("Lead", leadSchema);
