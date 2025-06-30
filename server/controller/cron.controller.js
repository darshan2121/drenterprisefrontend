
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";

// Run every 30 minutes
export const autoStepOut=async()=>{
  console.log("Running auto-step-out check...");

  const now = new Date();
  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  try {
    const records = await Attendance.find({
      stepOut: null,
      stepIn: { $lte: eightHoursAgo }
    });

    for (const attendance of records) {
      const stepOutTime = new Date();
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
