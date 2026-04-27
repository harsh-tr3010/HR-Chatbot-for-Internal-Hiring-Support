const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userType: String,
  message: String,
  response: String
}, { timestamps: true });

module.exports = mongoose.model("ChatHistory", chatSchema);