
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
import { getCurrentISTTime, getHoursAgoInIST, getCurrentISTHour } from "../utils/timeUtils.js";

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Returns today's date in IST formatted as YYYY-MM-DD.
 * This is used to build ISO timestamps with an explicit +05:30 offset,
 * avoiding reliance on the server's local timezone.
 */
const getISTDateYYYYMMDD = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const getCurrentISTMinute = (date = new Date()) => {
  const istMinute = parseInt(
    date.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      minute: "2-digit",
      hour12: false,
    }),
    10,
  );
  return istMinute;
};

const getISTStartOfDay = (date = new Date()) => {
  const ymd = getISTDateYYYYMMDD(date);
  return new Date(`${ymd}T00:00:00.000+05:30`);
};

const hashStringToUint32 = (str) => {
  let h = 2166136261; // FNV-1a base
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Deterministic seeded RNG.
 * Each draw hashes `${seed}|${counter}` to produce independent values.
 */              
const seededRng = (seed) => {
  let counter = 0;

  const nextUint32 = () => hashStringToUint32(`${seed}|${counter++}`);

  const nextInt = (minInclusive, maxInclusive) => {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    if (max < min) throw new Error(`seededRng.nextInt invalid range: ${min}..${max}`);
    const span = max - min + 1;
    return min + (nextUint32() % span);
  };

  return { nextUint32, nextInt };
};

// Run every 30 minutes
export const autoStepOut = async () => {
  console.log("Running auto-step-out check...");

  const now = getCurrentISTTime();
  const eightHoursAgo = getHoursAgoInIST(8);
  const istYmd = getISTDateYYYYMMDD(now);
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
      // Logic: step-out after 8 hours from step-in, with randomization (-15 to 0 minutes)
      const eightHoursInMs = 8 * 60 * 60 * 1000;
      const targetStepOut = new Date(attendance.stepIn.getTime() + eightHoursInMs);
      
      // Subtract random offset (0 to 15 minutes) + (0 to 59 seconds)
      const rng = seededRng(`${attendance.employeeId.toString()}|${istYmd}|stepout`);
      const randMinusMinutes = rng.nextInt(0, 15);
      const randMinusSeconds = rng.nextInt(0, 59);
      const randMinusMillis = rng.nextInt(0, 999);
      
      const stepOutTime = new Date(targetStepOut.getTime() - (randMinusMinutes * 60 * 1000) - (randMinusSeconds * 1000) - randMinusMillis);
      
      const totalTime = Math.round((stepOutTime - attendance.stepIn) / 60000);

      attendance.stepOut = stepOutTime;
      attendance.totalTime = totalTime;
      attendance.note = attendance.note || `Auto stepped out (Randomized: ${totalTime} mins)`;
      await attendance.save();

      await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });

      console.log(`Auto-stepped out: ${attendance.employeeId} at ${stepOutTime.toISOString()}`);
    }
  } catch (error) {
    console.error("Auto step-out failed:", error);
  }
}

// Run every 1 hour - Auto step-in at shift start times (7 AM, 3 PM, 11 PM)
export const autoStepIn = async () => {
  console.log("Running auto-step-in check...");

  const now = getCurrentISTTime();
  const overrideHourRaw = process.env.AUTO_STEPIN_TEST_HOUR;
  const overrideHour =
    overrideHourRaw !== undefined && overrideHourRaw !== null && overrideHourRaw !== ""
      ? Number(overrideHourRaw)
      : null;

  const currentHour = Number.isInteger(overrideHour) ? overrideHour : getCurrentISTHour(); // Get hour in IST (0-23)
  const currentMinute = getCurrentISTMinute(now);
  
  // Define shift start times and their corresponding shifts
  const shiftStartTimes = {
    7: 'morning',   // 7 AM
    15: 'evening',  // 3 PM (15:00)
    23: 'night'     // 11 PM (23:00)
  };

  // Check if current hour matches any shift start time
  const currentShift = shiftStartTimes[currentHour];
  
  if (!currentShift) {
    console.log(`Current hour (${currentHour}) is not a shift start time. Skipping auto step-in.`);
    return;
  }

  // We only randomize within the first 30 minutes of shift start.
  // If we run later (cron runs every minute during the shift hour), skip to avoid late auto step-ins.
  if (currentMinute > 30) {
    console.log(
      `Current time is ${currentHour}:${pad2(currentMinute)} IST (outside first 30 minutes). Skipping auto step-in.`,
    );
    return;
  }

  console.log(`Shift start detected: ${currentShift} shift at ${currentHour}:00`);

  // Random locations for auto step-in
  const randomLocations = [
    "Gujari bajar",
    "Dhobi Ghat",
    "Khodiyar nagar parking",
    "Subhash Bridge"
  ];

  try {
    // Get start of today in IST for duplicate checking
    const todayStart = getISTStartOfDay(now);
    
    // Find employees assigned to this shift who:
    // 1. Are not currently working (isWorking: false)
    // 2. Don't have an open attendance record (no stepOut: null)
    // 3. Haven't been auto-stepped-in today for this shift
    const employees = await Employee.find({
      shift: currentShift,
      isWorking: false,
      enableAutoPunch: { $ne: false }
    });

    console.log(`Found ${employees.length} employees for ${currentShift} shift`);

    let steppedInCount = 0;
    let skippedCount = 0;

    for (const employee of employees) {
      try {
        // Check if employee already has an open attendance record
        const openAttendance = await Attendance.findOne({
          employeeId: employee._id,
          stepOut: null
        });

        if (openAttendance) {
          console.log(`Employee ${employee.name} (${employee._id}) already has open attendance. Skipping.`);
          skippedCount++;
          continue;
        }

        // Check if employee was already auto-stepped-in today for this shift
        const todayAttendance = await Attendance.findOne({
          employeeId: employee._id,
          shift: currentShift,
          stepIn: { $gte: todayStart },
          note: { $regex: /Auto stepped in/i }
        });

        if (todayAttendance) {
          console.log(`Employee ${employee.name} (${employee._id}) already auto-stepped-in today for ${currentShift} shift. Skipping.`);
          skippedCount++;
          continue;
        }

        // Get random location for this employee
        const istYmd = getISTDateYYYYMMDD(now);
        const locationRng = seededRng(`${employee._id.toString()}|${istYmd}|${currentShift}|location`);
        const randomLocation = randomLocations[locationRng.nextInt(0, randomLocations.length - 1)];

        // Deterministic target time per employee per day per shift (0..30 minutes after shift start),
        // so repeated runs don't keep changing the planned time.
        const baseShiftTime = new Date(`${istYmd}T${pad2(currentHour)}:00:00.000+05:30`);

        if (now < baseShiftTime) {
          console.log(
            `Now (${now.toISOString()}) is before shift start (${baseShiftTime.toISOString()}). Skipping employee ${employee.name} (${employee._id}).`,
          );
          skippedCount++;
          continue;
        }

        const rng = seededRng(`${employee._id.toString()}|${istYmd}|${currentShift}|stepin`);
        const offsetMinutes = rng.nextInt(0, 30);
        const offsetSeconds = rng.nextInt(0, 59);
        const offsetMillis = rng.nextInt(0, 999);

        const stepInTime = new Date(
          baseShiftTime.getTime() +
            offsetMinutes * 60 * 1000 +
            offsetSeconds * 1000 +
            offsetMillis,
        );

        // Never create future step-ins; wait until the target time has arrived.
        if (now < stepInTime) {
          console.log(
            `Employee ${employee.name} (${employee._id}) target step-in ${stepInTime.toISOString()} not reached yet. Skipping for now.`,
          );
          skippedCount++;
          continue;
        }
        
        const attendance = new Attendance({
          employeeId: employee._id,
          managerId: employee.managerId,
          stepIn: stepInTime,
          stepInImage: null,
          stepInLongitude: 0,
          stepInLatitude: 0,
          stepInAddress: randomLocation,
          longitude: 0,
          latitude: 0,
          address: randomLocation,
          note: `Auto stepped in for ${currentShift} shift`,
          shift: currentShift
        });

        await attendance.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(employee._id, { isWorking: true });

        steppedInCount++;
        console.log(`Auto-stepped in: ${employee.name} (${employee._id}) for ${currentShift} shift at ${stepInTime.toISOString()} (${randomLocation})`);
      } catch (error) {
        console.error(`Error processing employee ${employee.name} (${employee._id}):`, error);
      }
    }

    console.log(`Auto step-in completed for ${currentShift} shift:`);
    console.log(`- Stepped in: ${steppedInCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Total processed: ${employees.length}`);

  } catch (error) {
    console.error("Auto step-in failed:", error);
  }
}