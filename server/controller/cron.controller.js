
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
import { getCurrentISTTime, getHoursAgoInIST } from "../utils/timeUtils.js";

// Run every 30 minutes
export const autoStepOut = async () => {
  console.log("Running auto-step-out check...");

  const now = getCurrentISTTime();
  const eightHoursAgo = getHoursAgoInIST(8);
console.log("eightHoursAgo",eightHoursAgo)
  try {
    const records = await Attendance.find({
      stepOut: null,
      stepIn: { $lte: eightHoursAgo }
    });
    console.log("Now:", now);
    console.log("Eight hours ago:", eightHoursAgo);
    console.log("Matched records:", records.map(r => r._id));
    for (const attendance of records) {
        // Use server time (IST) for stepOutTime
      const stepOutTime = getCurrentISTTime();
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
