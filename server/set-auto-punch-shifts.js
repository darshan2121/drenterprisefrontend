import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employee.models.js';

dotenv.config();

const TARGETS = {
  morning: 71, // 1st shift (7 AM)
  evening: 31, // 2nd shift (3 PM)
  night: 15, // 3rd shift (11 PM)
};

const TEST_NAME_PATTERN =
  /^(amin|newtest|cravora|darshan test|dev patel|baldev patni|jayram thakor|ramesh bhai thakor)$/i;

const normalizeName = (name) => name?.toString().trim().replace(/\s+/g, ' ') || '';

const isTestEmployee = (employee) => TEST_NAME_PATTERN.test(normalizeName(employee.name));

const checkDatabaseSafety = () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management';
  const isCloudDB =
    mongoUri.includes('mongodb+srv://') ||
    mongoUri.includes('mongodb.net') ||
    mongoUri.includes('atlas');
  const maskedUri = mongoUri
    .replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@')
    .replace(/mongodb:\/\/[^:]+:[^@]+@/, 'mongodb://***:***@');

  return { mongoUri, isCloudDB, maskedUri };
};

const sortEmployees = (a, b) => {
  const aTest = isTestEmployee(a) ? 1 : 0;
  const bTest = isTestEmployee(b) ? 1 : 0;
  if (aTest !== bTest) return aTest - bTest; // real employees first
  return normalizeName(a.name).localeCompare(normalizeName(b.name));
};

const setAutoPunchShifts = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const dbInfo = checkDatabaseSafety();

  console.log('\n' + '='.repeat(70));
  console.log('SET AUTO-PUNCH SHIFT COUNTS');
  console.log('='.repeat(70));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`Database: ${dbInfo.isCloudDB ? 'CLOUD' : 'LOCAL'}`);
  console.log(`URI: ${dbInfo.maskedUri}`);
  console.log(`Targets: morning=${TARGETS.morning}, evening=${TARGETS.evening}, night=${TARGETS.night}`);

  if (dbInfo.isCloudDB && !process.env.FORCE_PRODUCTION && !dryRun) {
    console.log('\nProduction database detected. Set FORCE_PRODUCTION=true to proceed.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbInfo.mongoUri);
    console.log(`Connected to: ${mongoose.connection.name}`);

    const employees = await Employee.find({});
    console.log(`Total employees: ${employees.length}`);

    const selectedIds = new Set();
    const selectedByShift = { morning: [], evening: [], night: [] };

    for (const shift of ['morning', 'evening', 'night']) {
      const target = TARGETS[shift];
      const onShift = employees
        .filter((e) => e.shift === shift && !selectedIds.has(e._id.toString()))
        .sort(sortEmployees);

      const picked = onShift.slice(0, target);
      for (const emp of picked) {
        selectedIds.add(emp._id.toString());
        selectedByShift[shift].push(emp);
      }
    }

    // Fill shortfalls from other-shift surplus (real employees first)
    for (const shift of ['morning', 'evening', 'night']) {
      const needed = TARGETS[shift] - selectedByShift[shift].length;
      if (needed <= 0) continue;

      const pool = employees
        .filter((e) => !selectedIds.has(e._id.toString()))
        .sort(sortEmployees)
        .slice(0, needed);

      for (const emp of pool) {
        selectedIds.add(emp._id.toString());
        selectedByShift[shift].push(emp);
      }
    }

    let updated = 0;
    let unchanged = 0;

    for (const emp of employees) {
      const id = emp._id.toString();
      let targetShift = null;
      for (const shift of ['morning', 'evening', 'night']) {
        if (selectedByShift[shift].some((e) => e._id.toString() === id)) {
          targetShift = shift;
          break;
        }
      }

      const enableAutoPunch = Boolean(targetShift);
      const nextShift = targetShift || emp.shift;

      const needsUpdate =
        emp.shift !== nextShift ||
        emp.enableAutoPunch !== enableAutoPunch;

      if (!needsUpdate) {
        unchanged++;
        continue;
      }

      console.log(
        `${enableAutoPunch ? 'ENABLE' : 'DISABLE'} ${normalizeName(emp.name)}: ` +
          `shift ${emp.shift} -> ${nextShift}, autoPunch ${emp.enableAutoPunch !== false} -> ${enableAutoPunch}`,
      );

      if (!dryRun) {
        emp.shift = nextShift;
        emp.enableAutoPunch = enableAutoPunch;
        await emp.save();
      }
      updated++;
    }

    console.log('\n' + '='.repeat(70));
    console.log('RESULT');
    console.log('='.repeat(70));
    for (const shift of ['morning', 'evening', 'night']) {
      console.log(
        `${shift}: ${selectedByShift[shift].length}/${TARGETS[shift]} auto-punch enabled`,
      );
    }
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${unchanged}`);
    console.log(`Disabled from auto-punch: ${employees.length - selectedIds.size}`);

    if (dryRun) {
      console.log('\nDry run complete. Re-run without --dry-run to apply.');
    }
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

setAutoPunchShifts();
