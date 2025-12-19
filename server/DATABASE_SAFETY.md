# 🛡️ Database Safety Guide

## Why This Matters

**Testing on production database can cause:**
- ❌ Real data modification
- ❌ Production records deleted
- ❌ Employee attendance records corrupted
- ❌ System downtime

## ✅ How to Verify You're on Local Database

### Step 1: Check Database Connection

```bash
cd server
npm run check:db
```

### Step 2: Look for These Indicators

**✅ SAFE - Local Database:**
```
📊 Database Type: 💻 LOCAL
📝 Database Name: labor-management
🌐 Host: localhost:27017
✅ Safe to proceed - Local database detected
```

**⚠️ DANGEROUS - Production Database:**
```
📊 Database Type: ☁️  CLOUD (MongoDB Atlas)
📝 Database Name: labor-management
🌐 Host: xxxxx.mongodb.net
⚠️  WARNING: You are connected to a PRODUCTION/CLOUD database!
```

## 🔧 How to Switch to Local Database

### Option 1: Update .env File

Create or edit `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/labor-management
```

### Option 2: Use MongoDB Compass Connection String

If using MongoDB Compass:
```
mongodb://localhost:27017/labor-management
```

### Option 3: Check Your Current .env

```bash
# View current database URI (masked)
npm run check:db
```

## 🚨 Safety Features Built-In

All test scripts now include:

1. **Automatic Detection**
   - Detects cloud vs local database
   - Shows database type before connecting

2. **Automatic Protection**
   - Exits if production database detected
   - Requires `FORCE_PRODUCTION=true` to override

3. **Clear Warnings**
   - Shows masked connection string
   - Provides instructions to fix

## 📋 Test Script Safety

### Before Running Tests:

```bash
# 1. Check database first
npm run check:db

# 2. If local, proceed with tests
npm run prepare:test
npm run test:stepin:morning
```

### If You See Production Warning:

```
⚠️  WARNING: You are connecting to a PRODUCTION/CLOUD database!
⚠️  This test will modify real data!
❌ Exiting for safety...
```

**Action Required:**
1. Update `.env` file with local MongoDB URI
2. Run `npm run check:db` again to verify
3. Then proceed with tests

## 🔍 How Detection Works

The scripts check for:

**Cloud/Production Indicators:**
- `mongodb+srv://` (MongoDB Atlas)
- `mongodb.net` (Atlas domain)
- `atlas` in connection string

**Local Indicators:**
- `localhost`
- `127.0.0.1`
- `mongodb://localhost`

## ✅ Verification Checklist

Before running any tests:

- [ ] Run `npm run check:db`
- [ ] Verify "LOCAL" database type
- [ ] Confirm "Safe to proceed" message
- [ ] Check database name is correct
- [ ] Verify connection works

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"

**Local MongoDB not running:**
```bash
# Start MongoDB (macOS)
brew services start mongodb-community

# Start MongoDB (Linux)
sudo systemctl start mongod

# Start MongoDB (Windows)
net start MongoDB
```

### "Still showing production"

**Check .env file:**
```bash
# Make sure .env has local URI
cat server/.env | grep MONGODB_URI
```

**Should show:**
```
MONGODB_URI=mongodb://localhost:27017/labor-management
```

### "Want to test on production anyway?"

**⚠️ NOT RECOMMENDED**, but if you must:

```bash
# Set environment variable
export FORCE_PRODUCTION=true
npm run test:stepin:morning
```

**This bypasses safety checks - use with extreme caution!**

## 📝 Summary

1. ✅ Always run `npm run check:db` first
2. ✅ Verify "LOCAL" database before testing
3. ✅ Test scripts protect you automatically
4. ✅ Update `.env` if needed
5. ✅ Never test on production without explicit confirmation


