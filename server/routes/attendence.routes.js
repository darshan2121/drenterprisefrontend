import express from "express";
import multer from "multer";
import {
  markStepIn,
  markStepOut,
  getEmployeeAttendance,
  getAllAttendance
} from "../controller/attendence.controller.js";
import { authenticateUser } from "../utils/middlewere.js";

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Step in: upload single image
router.post("/step-in", authenticateUser,upload.single("stepInImage"), markStepIn);

// Step out: parse FormData with no file
router.post("/step-out", authenticateUser, upload.none(), markStepOut);

router.get("/", authenticateUser, getAllAttendance);

// Add this route for fetching attendance by employeeId
router.get("/:employeeId", authenticateUser, getEmployeeAttendance);

export default router;