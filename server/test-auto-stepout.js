import mongoose from 'mongoose';
import Attendance from './models/attendence.models.js';
import Employee from './models/employee.models.js';
import { autoStepOut } from './controller/cron.controller.js';
import dotenv from 'dotenv';
import { getCurrentISTTime, getHoursAgoInIST } from './utils/timeUtils.js';

// Load environment variables
dotenv.config();

// Safety check: Detect database type
const checkDatabaseSafety = () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management';
  
  // Check if it's a cloud MongoDB (production)
  const isCloudDB = mongoUri.includes('mongodb+srv://') || 
                    mongoUri.includes('mongodb.net') ||
                    mongoUri.includes('atlas');
  
  // Check if it's local MongoDB
  const isLocalDB = mongoUri.includes('localhost') || 
                    mongoUri.includes('127.0.0.1') ||
                    mongoUri.startsWith('mongodb://localhost');
  
  // Extract database name for display
  let dbName = 'Unknown';
  try {
    if (mongoUri.includes('mongodb+srv://')) {
      const match = mongoUri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
      dbName = match ? match[1] : 'Unknown';
    } else if (mongoUri.includes('mongodb://')) {
      const match = mongoUri.match(/mongodb:\/\/[^/]+\/([^?]+)/);
      dbName = match ? match[1] : 'Unknown';
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return {
    uri: mongoUri,
    isCloudDB,
    isLocalDB,
    dbName,
    isProduction: isCloudDB || process.env.NODE_ENV === 'production'
  };
};

// Database connection with safety checks
const connectDB = async () => {
  const dbInfo = checkDatabaseSafety();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DATABASE CONNECTION CHECK');
  console.log('='.repeat(60));
  console.log(`📊 Database Type: ${dbInfo.isCloudDB ? '☁️  CLOUD (MongoDB Atlas)' : dbInfo.isLocalDB ? '💻 LOCAL' : '❓ UNKNOWN'}`);
  console.log(`📝 Database Name: ${dbInfo.dbName}`);
  console.log(`🌐 Connection: ${dbInfo.isCloudDB ? 'Production/Cloud' : 'Local'}`);
  
  // Show masked URI (hide credentials)
  const maskedUri = dbInfo.uri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@')
                                .replace(/mongodb:\/\/[^:]+:[^@]+@/, 'mongodb://***:***@');
  console.log(`🔗 URI: ${maskedUri}`);
  
  if (dbInfo.isProduction) {
    console.log('\n⚠️  WARNING: You are connecting to a PRODUCTION/CLOUD database!');
    console.log('⚠️  This test will modify real data!');
    console.log('\n🛑 To use LOCAL database:');
    console.log('   1. Set MONGODB_URI=mongodb://localhost:27017/labor-management in .env');
    console.log('   2. Or use: mongodb://127.0.0.1:27017/labor-management');
    console.log('\n💡 For safety, this script will exit.');
    console.log('   If you really want to test on production, set FORCE_PRODUCTION=true');
    
    if (process.env.FORCE_PRODUCTION !== 'true') {
      console.log('\n❌ Exiting for safety...');
      process.exit(1);
    } else {
      console.log('\n⚠️  FORCE_PRODUCTION=true detected. Proceeding with caution...');
    }
  } else {
    console.log('\n✅ Safe to proceed - Local database detected');
  }
  
  console.log('='.repeat(60) + '\n');
  
  try {
    await mongoose.connect(dbInfo.uri);
    console.log('✅ Connected to MongoDB');
    
    // Show actual database name after connection
    const db = mongoose.connection.db;
    if (db) {
      console.log(`📊 Connected to database: ${db.databaseName}`);
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Test function
const testAutoStepOut = async () => {
  await connectDB();
  
  console.log('\n=== Testing Auto Step-Out ===');
  
  // Get current time
  const now = getCurrentISTTime();
  const eightHoursAgo = getHoursAgoInIST(8);
  
  console.log('Current Time:', now.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
  console.log('Eight Hours Ago:', eightHoursAgo.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
  
  // Check current active attendance records
  const activeRecords = await Attendance.find({
    stepOut: null
  }).populate('employeeId', 'name');
  
  console.log(`\nActive Attendance Records: ${activeRecords.length}`);
  activeRecords.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const hoursWorked = Math.round((now - record.stepIn) / (1000 * 60 * 60));
    console.log(`- ${record.employeeId.name}: Clocked in at ${clockInTime} (${hoursWorked} hours ago)`);
  });
  
  // Check records that should be auto clocked out
  const recordsToAutoClockOut = await Attendance.find({
    stepOut: null,
    stepIn: { $lte: eightHoursAgo }
  }).populate('employeeId', 'name');
  
  console.log(`\nRecords that should be auto clocked out: ${recordsToAutoClockOut.length}`);
  recordsToAutoClockOut.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const hoursWorked = Math.round((now - record.stepIn) / (1000 * 60 * 60));
    console.log(`- ${record.employeeId.name}: Clocked in at ${clockInTime} (${hoursWorked} hours ago)`);
  });
  
  // Run the auto step-out function
  console.log('\n=== Running Auto Step-Out Function ===');
  await autoStepOut();
  
  // Check results after auto step-out
  console.log('\n=== Results After Auto Step-Out ===');
  const remainingActiveRecords = await Attendance.find({
    stepOut: null
  }).populate('employeeId', 'name');
  
  console.log(`Remaining Active Records: ${remainingActiveRecords.length}`);
  remainingActiveRecords.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const hoursWorked = Math.round((now - record.stepIn) / (1000 * 60 * 60));
    console.log(`- ${record.employeeId.name}: Clocked in at ${clockInTime} (${hoursWorked} hours ago)`);
  });
  
  // Check recently clocked out records
  const recentlyClockOut = await Attendance.find({
    stepOut: { $exists: true },
    stepOut: { $gte: new Date(now.getTime() - 5 * 60 * 1000) } // Last 5 minutes
  }).populate('employeeId', 'name');
  
  console.log(`\nRecently Clocked Out (Last 5 minutes): ${recentlyClockOut.length}`);
  recentlyClockOut.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const clockOutTime = new Date(record.stepOut).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    console.log(`- ${record.employeeId.name}: ${clockInTime} → ${clockOutTime} (${record.totalTime} minutes)`);
  });
  
  await mongoose.disconnect();
  console.log('\nTest completed!');
};

// Run the test
testAutoStepOut().catch(console.error);
