import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";

// Mark step in
export const markStepIn = async (req, res) => {
  try {
    // console.log("[DEBUG] markStepIn request body:", req.body);
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

export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { 
      longitude, 
      latitude, 
      address, 
      note, 
      stepOut,
      stepOutImage,
      totalTime,
      employeeId,
      managerId,
      stepIn,
      shift,
    } = req.body;

    // Find the attendance record
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Prepare update data
    const updateData = {};
    
    if (longitude !== undefined) updateData.longitude = longitude;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (address !== undefined) updateData.address = address;
    if (note !== undefined) updateData.note = note;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (stepIn !== undefined) updateData.stepIn = new Date(stepIn);
    if (totalTime !== undefined) updateData.totalTime = totalTime;
     if (shift !== undefined) updateData.shift = shift;

    // Handle stepOut update
    if (stepOut !== undefined) {
      updateData.stepOut = new Date(stepOut);
      
      // Calculate totalTime if not provided
      if (totalTime === undefined && attendance.stepIn) {
        const stepInTime = new Date(attendance.stepIn);
        const stepOutTime = new Date(stepOut);
        updateData.totalTime = Math.floor((stepOutTime - stepInTime) / (1000 * 60)); // in minutes
      }
      
      // Update employee working status when stepping out
      if (attendance.employeeId) {
        await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });
      }
    }

    // Handle image updates
    if (req.file) {
      // Determine which image to update based on field name or current state
      if (req.file.fieldname === 'stepOutImage' || stepOut !== undefined) {
        updateData.stepOutImage = req.file.filename;
      } else {
        updateData.stepInImage = req.file.filename;
      }
    }

    // Handle stepOutImage as string (if passed in body)
    if (stepOutImage !== undefined) {
      updateData.stepOutImage = stepOutImage;
    }

    // Update the attendance record
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      message: "Attendance updated successfully", 
      attendance: updatedAttendance 
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Error updating attendance", error });
  }
};



// Mark step out
export const markStepOut = async (req, res) => {
  try {
    if (!req.body || !req.body.attendanceId) {
      return res.status(400).json({ message: "attendanceId is required" });
    }
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
    const { employeeId } = req.params;
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required in params" });
    }
    const attendance = await Attendance.find({ employeeId })
      .populate("employeeId")
      .populate("managerId")
      .sort({ createdAt: 1 });
    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Error fetching attendance", error });
  }
};

// Get all attendance records (for admin reports)
export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({})
      .populate("employeeId")
      .populate("managerId")
      .sort({ createdAt: 1 });
    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    res.status(500).json({ message: "Error fetching all attendance", error });
  }
};


