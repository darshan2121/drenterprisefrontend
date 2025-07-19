import express from "express";
import multer from "multer";
import { markStepIn, markStepOut, getEmployeeAttendance } from "../controller/attendence.controller.js";
import { authenticateUser } from "../utils/middlewere.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Define upload directory path (goes up one level from current file)
const uploadDir = path.join(__dirname, "../upload");

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the resolved path
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Step in: upload single image
router.post("/step-in", authenticateUser, upload.single("stepInImage"), markStepIn);

// Step out: upload single image
router.post("/step-out", authenticateUser, markStepOut);

router.get("/", authenticateUser, getEmployeeAttendance);

export default router;