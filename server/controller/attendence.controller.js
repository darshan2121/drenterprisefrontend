import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";

// Mark step in
export const markStepIn = async (req, res) => {
  try {
    const { employeeId, managerId, longitude, latitude, address, note } = req.body;

    // Check if there is already an open attendance for this employee
    const openAttendance = await Attendance.findOne({ employeeId, stepOut: { $exists: false } });
    if (openAttendance) {
      return res.status(400).json({ message: "Already stepped in. Please step out before stepping in again." });
    }

    const stepIn = new Date();
    const stepInImage = req.file ? req.file.filename : null;

    const attendance = new Attendance({
      employeeId,
      managerId,
      stepIn,
      stepInImage,
      longitude,
      latitude,
      address,
      note
    });

    await attendance.save();
    await Employee.findByIdAndUpdate(employeeId, { isWorking: true });
    res.status(201).json({ message: "Step In marked", attendance });
  } catch (error) {
    console.error("Error marking step in:", error);
    res.status(500).json({ message: "Error marking step in", error });
  }
};
// Mark step out
export const markStepOut = async (req, res) => {
  try {
    const { attendanceId, longitude, latitude, address, note } = req.body;
    const stepOut = new Date();
    const stepOutImage = req.file ? req.file.filename : null; // Save only the filename

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const totalTime = Math.round((stepOut - attendance.stepIn) / 60000);

    attendance.stepOut = stepOut;
    attendance.stepOutImage = stepOutImage;
    attendance.longitude = longitude;
    attendance.latitude = latitude;
    attendance.address = address;
    attendance.totalTime = totalTime;
    attendance.note = note || attendance.note;

    await attendance.save();
     await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });
    
    res.status(200).json({ message: "Step Out marked", attendance });
  } catch (error) {
    console.error("Error marking step out:", error);
    res.status(500).json({ message: "Error marking step out", error });
  }
};

// Get all attendance for an employee
export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId, managerId, startDate, endDate, order = 'asc' } = req.query;

    const query = {};
    const userData=req.user

if(userData){
    if (userData.userType=="manager") {
      query.managerId = userData.id;
    }
    else if(managerId){
      query.managerId = managerId;
    }


}

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate || endDate) {
      query.createdAt = {}; // <-- changed from 'date' to 'createdAt'
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sortOrder = order === 'desc' ? -1 : 1;

    const attendance = await Attendance.find(query)
      .populate("employeeId")
      .populate("managerId")
      .sort({ createdAt: sortOrder }); // <-- sort on 'createdAt'

    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Error fetching attendance", error });
  }
};


