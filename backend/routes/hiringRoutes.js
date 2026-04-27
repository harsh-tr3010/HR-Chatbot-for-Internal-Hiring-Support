const express = require("express");
const router = express.Router();
const HiringRequest = require("../models/HiringRequest");

router.post("/add", async (req, res) => {
  try {
    const request = await HiringRequest.create(req.body);
    res.json({
      message: "Hiring Request Created",
      request
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  const data = await HiringRequest.find();
  res.json(data);
});

module.exports = router;