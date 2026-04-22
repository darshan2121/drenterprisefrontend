import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "./models/attendence.models.js";
import Employee from "./models/employee.models.js";

dotenv.config();

const pad2 = (n) => String(n).padStart(2, "0");

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

const getISTStartOfDay = (date = new Date()) => {
  const ymd = getISTDateYYYYMMDD(date);
  return new Date(`${ymd}T00:00:00.000+05:30`);
};

const checkDatabaseSafety = () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/labor-management";

  const isCloudDB =
    mongoUri.includes("mongodb+srv://") || mongoUri.includes("mongodb.net") || mongoUri.includes("atlas");

  const isLocalDB =
    mongoUri.includes("localhost") || mongoUri.includes("127.0.0.1") || mongoUri.startsWith("mongodb://localhost");

  let dbName = "Unknown";
  try {
    if (mongoUri.includes("mongodb+srv://")) {
      const match = mongoUri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
      dbName = match ? match[1] : "Unknown";
    } else if (mongoUri.includes("mongodb://")) {
      const match = mongoUri.match(/mongodb:\/\/[^/]+\/([^?]+)/);
      dbName = match ? match[1] : "Unknown";
    }
  } catch {
    // ignore
  }

  return {
    uri: mongoUri,
    isCloudDB,
    isLocalDB,
    dbName,
    isProduction: isCloudDB || process.env.NODE_ENV === "production",
  };
};

const connectDB = async () => {
  const dbInfo = checkDatabaseSafety();

  console.log("\n" + "=".repeat(60));
  console.log("🔍 DATABASE CONNECTION CHECK");
  console.log("=".repeat(60));
  console.log(
    `📊 Database Type: ${
      dbInfo.isCloudDB ? "☁️  CLOUD (MongoDB Atlas)" : dbInfo.isLocalDB ? "💻 LOCAL" : "❓ UNKNOWN"
    }`,
  );
  console.log(`📝 Database Name: ${dbInfo.dbName}`);

  const maskedUri = dbInfo.uri
    .replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, "mongodb+srv://***:***@")
    .replace(/mongodb:\/\/[^:]+:[^@]+@/, "mongodb://***:***@");
  console.log(`🔗 URI: ${maskedUri}`);

  if (dbInfo.isProduction && process.env.FORCE_PRODUCTION !== "true") {
    console.log("\n⚠️  WARNING: You are connecting to a PRODUCTION/CLOUD database!");
    console.log("⚠️  This script will MODIFY real data!");
    console.log("\n❌ Exiting for safety. If you are sure, run with FORCE_PRODUCTION=true");
    process.exit(1);
  }

  await mongoose.connect(dbInfo.uri);
  console.log("✅ Connected to MongoDB");
  console.log("=".repeat(60) + "\n");
};

const randomInt = (minInclusive, maxInclusive) =>
  Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;

const wantUpdateExisting = process.env.UPDATE_EXISTING_AUTO_STEPINS === "true";

const run = async () => {
  await connectDB();

  const now = new Date();
  const istYmd = getISTDateYYYYMMDD(now);
  const todayStart = getISTStartOfDay(now);

  const shiftHour = 15; // evening shift start (3 PM IST)
  const shiftStart = new Date(`${istYmd}T${pad2(shiftHour)}:00:00.000+05:30`);
  const shiftEnd = new Date(`${istYmd}T${pad2(shiftHour)}:30:00.000+05:30`);

  if (now < shiftStart) {
    console.log("Now is before 3:00 PM IST. Nothing to backfill yet.");
    return;
  }

  const capEnd = new Date(Math.min(shiftEnd.getTime(), now.getTime()));
  if (capEnd <= shiftStart) {
    console.log("Backfill window is empty (shiftStart >= capEnd).");
    return;
  }

  console.log("Backfill window (IST):");
  console.log("- Shift start:", shiftStart.toISOString());
  console.log("- Shift end  :", shiftEnd.toISOString());
  console.log("- Capped end :", capEnd.toISOString());

  if (wantUpdateExisting) {
    console.log("\nUPDATE_EXISTING_AUTO_STEPINS=true enabled.");
    console.log("Updating existing evening auto-step-ins into the 15:00–15:30 window (capped to now).");

    const existing = await Attendance.find({
      shift: "evening",
      stepIn: { $gte: todayStart },
      note: { $regex: /Auto stepped in/i },
    });

    console.log(`Found ${existing.length} existing auto step-ins today (evening).`);

    let updated = 0;
    for (const rec of existing) {
      // If already within window and not in future, keep it.
      const current = new Date(rec.stepIn);
      if (current >= shiftStart && current <= capEnd) continue;

      const spanMs = capEnd.getTime() - shiftStart.getTime();
      const offsetMs = spanMs <= 0 ? 0 : randomInt(0, spanMs);
      const newStepIn = new Date(shiftStart.getTime() + offsetMs);

      rec.stepIn = newStepIn;
      await rec.save();
      updated++;
    }

    console.log("Updated existing records:", updated);
  }

  const employees = await Employee.find({ shift: "evening", isWorking: false });
  console.log(`\nFound ${employees.length} evening-shift employees with isWorking=false`);

  let created = 0;
  let skipped = 0;

  for (const employee of employees) {
    // skip if open attendance exists
    const openAttendance = await Attendance.findOne({
      employeeId: employee._id,
      stepOut: null,
    });
    if (openAttendance) {
      skipped++;
      continue;
    }

    // skip if already auto-stepped-in today for evening shift
    const existingAuto = await Attendance.findOne({
      employeeId: employee._id,
      shift: "evening",
      stepIn: { $gte: todayStart },
      note: { $regex: /Auto stepped in/i },
    });
    if (existingAuto) {
      skipped++;
      continue;
    }

    // random time between [shiftStart, capEnd]
    const spanMs = capEnd.getTime() - shiftStart.getTime();
    const offsetMs = spanMs <= 0 ? 0 : randomInt(0, spanMs);
    const stepInTime = new Date(shiftStart.getTime() + offsetMs);

    await Attendance.create({
      employeeId: employee._id,
      managerId: employee.managerId,
      stepIn: stepInTime,
      stepInImage: null,
      stepInLongitude: 0,
      stepInLatitude: 0,
      stepInAddress: "Auto backfill (evening)",
      longitude: 0,
      latitude: 0,
      address: "Auto backfill (evening)",
      note: "Auto stepped in for evening shift (backfill 15:00–15:30 IST)",
      shift: "evening",
    });

    await Employee.findByIdAndUpdate(employee._id, { isWorking: true });
    created++;
  }

  console.log("\nDONE");
  console.log("- Created:", created);
  console.log("- Skipped:", skipped);
};

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });

