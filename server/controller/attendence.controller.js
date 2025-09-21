import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
import Admin from "../models/admin.models.js";
import { getCurrentISTTime, getHoursAgoInIST, formatAttendanceForAPI } from "../utils/timeUtils.js";



// Default shift configurations
const DEFAULT_SHIFT_TIMES = {
  morning: { 
    stepIn: "07:00", 
    stepOut: "15:00", // 3:00 PM
    label: "7 AM - 3 PM (Morning)"
  },
  evening: { 
    stepIn: "15:00", // 3:00 PM
    stepOut: "23:00", // 11:00 PM
    label: "3 PM - 11 PM (Evening)"
  },
  night: { 
    stepIn: "23:00", // 11:00 PM
    stepOut: "07:00", // 7:00 AM (next day)
    label: "11 PM - 7 AM (Night)"
  }
};

// Function to auto-detect shift based on clock-in time
const getShiftFromTime = (clockInTime) => {
  const hour = clockInTime.getHours();
  
  if (hour >= 7 && hour < 15) { // 7:00 AM to 2:59 PM
    return 'morning';
  } else if (hour >= 15 && hour < 23) { // 3:00 PM to 10:59 PM
    return 'evening';
  } else { // 11:00 PM to 6:59 AM
    return 'night';
  }
};

// Function to get shift end time based on shift type
const getShiftEndTime = (clockInTime, shift) => {
  const clockInDate = new Date(clockInTime);
  const year = clockInDate.getFullYear();
  const month = clockInDate.getMonth();
  const date = clockInDate.getDate();
  
  switch (shift) {
    case 'morning':
      // Morning shift ends at 3:00 PM same day
      return new Date(year, month, date, 15, 0, 0);
    case 'evening':
      // Evening shift ends at 11:00 PM same day
      return new Date(year, month, date, 23, 0, 0);
    case 'night':
      // Night shift ends at 7:00 AM next day
      return new Date(year, month, date + 1, 7, 0, 0);
    default:
      // Default to 8 hours from clock-in
      return new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000);
  }
};


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

    const stepIn = getCurrentISTTime();
    const stepInImage = req.file ? req.file.filename : null;
    
    // Auto-detect shift based on clock-in time
    const detectedShift = getShiftFromTime(stepIn);
    console.log(`Auto-detected shift: ${detectedShift} for clock-in time: ${stepIn.toLocaleString()}`);

    const attendance = new Attendance({
      employeeId,
      managerId,
      stepIn,
      stepInImage,
      stepInLongitude: longitude,
      stepInLatitude: latitude,
      stepInAddress: address,
      // Keep legacy fields for backward compatibility
      longitude,
      latitude,
      address,
      note,
      shift: detectedShift // Use auto-detected shift
    });

    await attendance.save();
    await Employee.findByIdAndUpdate(employeeId, { isWorking: true });
    res.status(201).json({ 
      message: "Step In marked", 
      attendance: formatAttendanceForAPI(attendance),
      detectedShift: detectedShift,
      shiftEndTime: getShiftEndTime(stepIn, detectedShift)
    });
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


export const bulkUpdateAttendance = async (req, res) => {
  try {
    const { attendanceIds, stepIn, stepOut, shift } = req.body;

    // Validate input
    if (!attendanceIds || !Array.isArray(attendanceIds)) {
      return res.status(400).json({ message: "attendanceIds must be an array" });
    }

    if (attendanceIds.length === 0) {
      return res.status(400).json({ message: "No attendance records selected" });
    }

    // Prepare update data
    const updateData = {};
    if (stepIn !== undefined) updateData.stepIn = new Date(stepIn);
    if (stepOut !== undefined) updateData.stepOut = new Date(stepOut);
    if (shift !== undefined) updateData.shift = shift;

    // If both stepIn and stepOut are provided, calculate totalTime
    if (stepIn !== undefined && stepOut !== undefined) {
      const stepInTime = new Date(stepIn);
      const stepOutTime = new Date(stepOut);
      updateData.totalTime = Math.floor((stepOutTime - stepInTime) / (1000 * 60)); // in minutes
    }

    // Update all selected attendance records
    const result = await Attendance.updateMany(
      { _id: { $in: attendanceIds } },
      updateData,
      { runValidators: true }
    );

    // Update employee working status if stepping out
    if (stepOut !== undefined) {
      // Get all affected employeeIds
      const attendances = await Attendance.find({ _id: { $in: attendanceIds } });
      const employeeIds = [...new Set(attendances.map(a => a.employeeId))];
      
      await Employee.updateMany(
        { _id: { $in: employeeIds } },
        { isWorking: false }
      );
    }

    res.status(200).json({
      message: `Successfully updated ${result.modifiedCount} attendance records`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error bulk updating attendance:", error);
    res.status(500).json({ message: "Error bulk updating attendance", error });
  }
};


// Mark step out
export const markStepOut = async (req, res) => {
  try {
    if (!req.body || !req.body.attendanceId) {
      return res.status(400).json({ message: "attendanceId is required" });
    }
    const { attendanceId, longitude, latitude, address, note } = req.body;
    const stepOut = getCurrentISTTime();
    const stepOutImage = req.file ? req.file.filename : null; // Save only the filename

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const totalTime = Math.round((stepOut - attendance.stepIn) / 60000);

    attendance.stepOut = stepOut;
    attendance.stepOutImage = stepOutImage;
    attendance.stepOutLongitude = longitude;
    attendance.stepOutLatitude = latitude;
    attendance.stepOutAddress = address;
    // Keep legacy fields for backward compatibility
    attendance.longitude = longitude;
    attendance.latitude = latitude;
    attendance.address = address;
    attendance.totalTime = totalTime;
    attendance.note = note || attendance.note;

    await attendance.save();
     await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });
    
    res.status(200).json({ message: "Step Out marked", attendance: formatAttendanceForAPI(attendance) });
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
    const { managerId, employeeId, startDate, endDate, order = 'desc' } = req.query;
    
    // Build query object
    const query = {};
    
    // Filter by manager
    if (managerId) {
      query.managerId = managerId;
    }
    
    // Filter by employee
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.stepIn = {};
      if (startDate) {
        query.stepIn.$gte = new Date(startDate);
      }
      if (endDate) {
        query.stepIn.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // Build sort object
    const sort = {};
    if (order === 'desc') {
      sort.createdAt = -1;
    } else {
      sort.createdAt = 1;
    }
    
    const attendance = await Attendance.find(query)
      .populate("employeeId")
      .populate("managerId")
      .sort(sort);
      
    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    res.status(500).json({ message: "Error fetching all attendance", error });
  }
};

// Bulk step-in for all employees (Admin only - mohit123456rathod@gmail.com)
export const bulkStepIn = async (req, res) => {
  try {
    // Check if the request is from the authorized admin
    const adminEmail = req.body.adminEmail || req.headers['admin-email'];
    
    if (adminEmail !== 'mohit123456rathod@gmail.com') {
      return res.status(403).json({ 
        message: "Access denied. Only authorized admin can perform bulk step-in." 
      });
    }

    // Get admin details
    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const { shift, longitude, latitude, address, note } = req.body;
    const stepInImage = req.file ? req.file.filename : null;

    if (!shift) {
      return res.status(400).json({ message: "Shift is required" });
    }

    // Validate shift
    if (!['morning', 'evening', 'night'].includes(shift)) {
      return res.status(400).json({ message: "Invalid shift. Must be morning, evening, or night" });
    }

    const stepIn = getCurrentISTTime();
    
    // Get all employees for this admin
    const employees = await Employee.find({ 
      shift: shift,
      isWorking: false // Only employees who are not currently working
    });

    if (employees.length === 0) {
      return res.status(404).json({ message: "No available employees found for bulk step-in" });
    }

    const results = {
      success: [],
      failed: [],
      alreadyWorking: []
    };

    // Process each employee
    for (const employee of employees) {
      try {
        // Check if employee is already clocked in
        const existingAttendance = await Attendance.findOne({ 
          employeeId: employee._id, 
          stepOut: { $exists: false } 
        });

        if (existingAttendance) {
          results.alreadyWorking.push({
            employeeId: employee._id,
            employeeName: employee.name,
            reason: "Already clocked in"
          });
          continue;
        }

        // Create attendance record
        const attendance = new Attendance({
          employeeId: employee._id,
          managerId: admin._id, // Use admin as manager for bulk operations
          stepIn,
          stepInImage, // Use admin's step-in image for all employees
          stepInLongitude: longitude || 0,
          stepInLatitude: latitude || 0,
          stepInAddress: address || 'Bulk step-in location',
          // Keep legacy fields for backward compatibility
          longitude: longitude || 0,
          latitude: latitude || 0,
          address: address || 'Bulk step-in location',
          note: note || `Bulk step-in by admin ${admin.name}`,
          shift
        });

        await attendance.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(employee._id, { isWorking: true });

        results.success.push({
          employeeId: employee._id,
          employeeName: employee.name,
          attendanceId: attendance._id,
          stepIn: formatAttendanceForAPI(attendance).stepIn
        });

      } catch (error) {
        console.error(`Error processing employee ${employee.name}:`, error);
        results.failed.push({
          employeeId: employee._id,
          employeeName: employee.name,
          error: error.message
        });
      }
    }

    console.log(`Bulk step-in completed by admin ${admin.name}:`);
    console.log(`- Success: ${results.success.length}`);
    console.log(`- Failed: ${results.failed.length}`);
    console.log(`- Already working: ${results.alreadyWorking.length}`);

    res.status(200).json({
      message: "Bulk step-in completed",
      results,
      summary: {
        totalEmployees: employees.length,
        successful: results.success.length,
        failed: results.failed.length,
        alreadyWorking: results.alreadyWorking.length
      }
    });

  } catch (error) {
    console.error("Error in bulk step-in:", error);
    res.status(500).json({ message: "Error in bulk step-in", error: error.message });
  }
};




