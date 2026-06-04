const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    stage:    {
      type: String,
      enum: ["prospecting", "proposal", "negotiation", "won", "lost"],
      default: "prospecting",
    },
    amount:   { type: Number, default: 0, min: 0 },
    owner:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

opportunitySchema.index({ owner: 1 });
opportunitySchema.index({ stage: 1 });
opportunitySchema.index({ customer: 1 });

module.exports = mongoose.model("Opportunity", opportunitySchema);
