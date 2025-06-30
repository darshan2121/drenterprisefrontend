import express from "express";
import multer from "multer";
import {
  markStepIn,
  markStepOut,
  getEmployeeAttendance
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

// Step out: upload single image
router.post("/step-out", authenticateUser, markStepOut);

router.get("/",authenticateUser, getEmployeeAttendance);

export default router;