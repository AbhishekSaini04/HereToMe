const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Upload = require("../models/Upload");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Login route
router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).render("login", {
        title: "Login",
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
    });

    res.redirect("/");
  } catch (error) {
    res.status(500).render("error", {
      title: "Error",
      message: "Server error",
    });
  }
});

// Signup route
router.get("/signup", (req, res) => {
  res.render("signup", { title: "Sign Up" });
});

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.create({ username, email, password });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hour
    });

    res.redirect("/");
  } catch (error) {
    res.status(400).render("signup", {
      title: "Sign Up",
      error: "Email already exists",
    });
  }
});

// Upload routes
router.get("/upload", isAuthenticated, (req, res) => {
  res.render("upload", { title: "Upload Files", user: req.user });
});

router.post(
  "/upload",
  isAuthenticated,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).render("upload", {
          title: "Upload Files",
          error: "Please select a file to upload",
        });
      }

      const uploadDoc = await Upload.create({
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user._id,
      });

      res.redirect("/");
    } catch (error) {
      res.status(500).render("upload", {
        title: "Upload Files",
        error: "Upload failed",
      });
    }
  }
);

// File download route
router.get("/download/:fileId", isAuthenticated, async (req, res) => {
  try {
    const file = await Upload.findById(req.params.fileId);

    if (!file) {
      return res.status(404).render("error", {
        title: "Error",
        message: "File not found",
      });
    }

    // Check if user has permission to download
    if (
      file.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).render("error", {
        title: "Error",
        message: "Access denied",
      });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).render("error", {
      title: "Error",
      message: "Download failed",
    });
  }
});

// File delete route
router.get("/delete/:fileId", isAuthenticated, async (req, res) => {
  try {
    // console.log(req.params.fileId);
    const file = await Upload.findById(req.params.fileId);
    const deleted = await Upload.deleteOne({ _id: req.params.fileId });
    const fs = require("fs");
    const filePath = file.path;
    fs.unlinkSync(filePath);
    return res.redirect("/");
  } catch (e) {
    res.status(500).render("error", {
      title: "Error",
      message: "Deletion failed",
    });
  }
});

// Admin route to get all users info
router.get("/getinfo", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "normal" }).select("-password");
    res.render("userinfo", { title: "User Information", users: users });
  } catch (error) {
    res.status(500).render("error", {
      title: "Error",
      message: "Server error",
    });
  }
});

// Logout route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/user/login");
});

module.exports = router;
