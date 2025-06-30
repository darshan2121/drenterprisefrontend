// controllers/authController.js
import Admin from "../models/admin.models.js";
import Manager from "../models/manager.models.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config(); // Ensure this is at the top
import bcrypt from "bcrypt";

export const forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email || !userType) {
      return res.status(400).json({ message: "Email and userType are required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let userModel = userType === "admin" ? Admin : userType === "manager" ? Manager : null;
    if (!userModel) return res.status(400).json({ message: "Invalid userType" });

    const user = await userModel.findOneAndUpdate(
      { email },
      { otp, otpExpires },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: `${userType} not found` });

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail", // or SMTP config
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"YourApp Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Use the following OTP to reset your password:</p>
          <div style="font-size: 24px; font-weight: bold; color: #2d89ff; margin: 20px 0;">${otp}</div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn’t request this, you can ignore this email.</p>
          <p style="margin-top: 30px; font-size: 14px; color: #999;">© YourApp Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Error sending OTP", error: err.message });
  }
};





export const verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, userType, otp, newPassword } = req.body;

    if (!email || !userType || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const model = userType === "admin" ? Admin : userType === "manager" ? Manager : null;
    if (!model) return res.status(400).json({ message: "Invalid user type" });

    const user = await model.findOne({ email, otp });

    if (!user) return res.status(400).json({ message: "Invalid OTP or email" });
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
};