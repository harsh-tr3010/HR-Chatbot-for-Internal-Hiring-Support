const mongoose = require("mongoose");

const hiringSchema = new mongoose.Schema({
  department: String,
  jobTitle: String,
  positions: Number,
  experience: Number,
  skills: [String],
  location: String,
  budget: String,
  manager: String,
  urgency: String,
  reason: String,
  type: String
}, { timestamps: true });

module.exports = mongoose.model("HiringRequest", hiringSchema);