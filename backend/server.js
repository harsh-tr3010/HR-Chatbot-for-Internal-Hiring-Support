const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HireFlow AI Backend Running");
});

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log("Server running");
});