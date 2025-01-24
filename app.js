const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const { isAuthenticated } = require("./middleware/auth");
const Upload = require("./models/Upload");

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Create uploads directory if it doesn't exist
const fs = require("fs");
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Routes
app.get("/", isAuthenticated, async (req, res) => {
  try {
    const files = await Upload.find({ uploadedBy: req.user._id }).sort({
      uploadDate: -1,
    });

    res.render("index", {
      title: "Home",
      user: req.user,
      files: files,
    });
  } catch (error) {
    res.status(500).render("error", {
      title: "Error",
      message: "Failed to load files",
    });
  }
});

app.use("/user", userRoutes);

// 404 route
app.use((req, res) => {
  res.status(404).render("404", { title: "404 Not Found" });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
