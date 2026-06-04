const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:      { type: String, required: true },
    role:              { type: String, enum: ["manager", "admin"], required: true },
    assignedCustomers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
  },
  { timestamps: true }
);

// Never return the password hash in JSON responses
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
