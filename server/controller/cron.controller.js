
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";

// Run every 30 minutes
export const autoStepOut = async () => {
  console.log("Running auto-step-out check...");

  // Add +5:30 hours to get IST time
  const now = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  try {
    const records = await Attendance.find({
      stepOut: null,
      stepIn: { $lte: eightHoursAgo }
    });

    for (const attendance of records) {
      // Use IST for stepOutTime
      const stepOutTime = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
      const totalTime = Math.round((stepOutTime - attendance.stepIn) / 60000);

      attendance.stepOut = stepOutTime;
      attendance.totalTime = totalTime;
      attendance.note = attendance.note || "Auto stepped out after 8 hours";
      await attendance.save();

      await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });

      console.log(`Auto-stepped out: ${attendance.employeeId}`);
    }
  } catch (error) {
    console.error("Auto step-out failed:", error);
  }
}
