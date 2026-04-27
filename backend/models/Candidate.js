const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  location: String,
  qualification: String,
  totalExperience: Number,
  relevantExperience: Number,
  skills: [String],
  currentCTC: Number,
  expectedCTC: Number,
  noticePeriod: String,
  preferredRole: String,
  resumeLink: String,
  status: {
    type: String,
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Candidate", candidateSchema);