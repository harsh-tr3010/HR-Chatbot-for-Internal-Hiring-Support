const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: String,
  department: String,
  location: String,
  experience: Number,
  skills: [String],
  description: String,
  employmentType: String,
  deadline: String
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);