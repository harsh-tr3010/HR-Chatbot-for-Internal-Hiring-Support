const express = require("express");
const router = express.Router();
const Candidate = require("../models/Candidate");

router.post("/apply", async (req, res) => {
  try {
    const candidate = await Candidate.create(req.body);
    res.json({
      message: "Application Submitted Successfully",
      candidate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  const data = await Candidate.find();
  res.json(data);
});

module.exports = router;