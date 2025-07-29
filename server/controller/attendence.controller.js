import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";



// Default shift configurations
const DEFAULT_SHIFT_TIMES = {
  morning: { 
    stepIn: "07:00", 
    stepOut: "15:00",
    label: "7 AM - 3 PM (Morning)"
  },
  evening: { 
    stepIn: "14:00", 
    stepOut: "22:00",
    label: "2 PM - 10 PM (Evening)"
  },
  night: { 
    stepIn: "22:00", 
    stepOut: "07:00",
    label: "10 PM - 7 AM (Night)"
  }
};


// Mark step in
export const markStepIn = async (req, res) => {
  try {
    // console.log("[DEBUG] markStepIn request body:", req.body);
    const { employeeId, managerId, longitude, latitude, address, note,shift } = req.body;

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
      note,
shift
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

// Bulk update attendance records
export const bulkUpdateAttendance = async (req, res) => {
  try {
    const { attendanceIds, stepIn, stepOut, shift } = req.body;
    
    console.log('Bulk update request:', { attendanceIds, stepIn, stepOut, shift });
    
    if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ message: "attendanceIds array is required" });
    }
    
    if (!stepIn || !stepOut || !shift) {
      return res.status(400).json({ message: "stepIn, stepOut, and shift are required" });
    }
    
    // Validate shift
    const validShifts = ['morning', 'evening', 'night'];
    if (!validShifts.includes(shift)) {
      return res.status(400).json({ message: "Invalid shift value" });
    }
    
    // Parse dates
    const stepInDate = new Date(stepIn);
    const stepOutDate = new Date(stepOut);
    
    console.log('Parsed dates:', { 
      stepIn: stepInDate.toISOString(), 
      stepOut: stepOutDate.toISOString() 
    });
    
    if (isNaN(stepInDate.getTime()) || isNaN(stepOutDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format for stepIn or stepOut" });
    }
    
    // Calculate total time in minutes
    const totalTime = Math.floor((stepOutDate - stepInDate) / (1000 * 60));
    
    console.log('Total time calculated:', totalTime, 'minutes');
    
    // Update all attendance records
    const updatePromises = attendanceIds.map(async (attendanceId) => {
      const attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        throw new Error(`Attendance record with ID ${attendanceId} not found`);
      }
      
      console.log(`Updating attendance ${attendanceId}:`, {
        oldStepIn: attendance.stepIn,
        oldStepOut: attendance.stepOut,
        oldShift: attendance.shift,
        newStepIn: stepInDate,
        newStepOut: stepOutDate,
        newShift: shift,
        stepInISO: stepInDate.toISOString(),
        stepOutISO: stepOutDate.toISOString()
      });
      
      // Update the attendance record
      attendance.stepIn = stepInDate;
      attendance.stepOut = stepOutDate;
      attendance.shift = shift;
      attendance.totalTime = totalTime;
      
      const savedRecord = await attendance.save();
      
      console.log(`Saved attendance ${attendanceId}:`, {
        savedStepIn: savedRecord.stepIn,
        savedStepOut: savedRecord.stepOut,
        savedShift: savedRecord.shift,
        savedStepInISO: savedRecord.stepIn.toISOString(),
        savedStepOutISO: savedRecord.stepOut.toISOString()
      });
      
      return savedRecord;
    });
    
    const updatedRecords = await Promise.all(updatePromises);
    
    console.log(`Successfully updated ${updatedRecords.length} records`);
    console.log('Updated records sample:', updatedRecords.slice(0, 2).map(record => ({
      _id: record._id,
      stepIn: record.stepIn,
      stepOut: record.stepOut,
      shift: record.shift,
      totalTime: record.totalTime
    })));
    
    res.status(200).json({ 
      message: `Successfully updated ${updatedRecords.length} attendance record(s)`,
      updatedCount: updatedRecords.length,
      records: updatedRecords
    });
    
  } catch (error) {
    console.error("Error in bulk update attendance:", error);
    res.status(500).json({ 
      message: "Error updating attendance records", 
      error: error.message 
    });
  }
};


