import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
  let host = 'Unknown';
  try {
    if (mongoUri.includes('mongodb+srv://')) {
      const match = mongoUri.match(/mongodb\+srv:\/\/([^/]+)\/([^?]+)/);
      if (match) {
        host = match[1];
        dbName = match[2];
      }
    } else if (mongoUri.includes('mongodb://')) {
      const match = mongoUri.match(/mongodb:\/\/([^/]+)\/([^?]+)/);
      if (match) {
        host = match[1];
        dbName = match[2];
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return {
    uri: mongoUri,
    isCloudDB,
    isLocalDB,
    dbName,
    host,
    isProduction: isCloudDB || process.env.NODE_ENV === 'production'
  };
};

// Check database connection
const checkDatabase = async () => {
  const dbInfo = checkDatabaseSafety();
  
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DATABASE CONNECTION CHECK');
  console.log('='.repeat(70));
  console.log(`📊 Database Type: ${dbInfo.isCloudDB ? '☁️  CLOUD (MongoDB Atlas)' : dbInfo.isLocalDB ? '💻 LOCAL' : '❓ UNKNOWN'}`);
  console.log(`📝 Database Name: ${dbInfo.dbName}`);
  console.log(`🌐 Host: ${dbInfo.host}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Show masked URI (hide credentials)
  const maskedUri = dbInfo.uri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@')
                                .replace(/mongodb:\/\/[^:]+:[^@]+@/, 'mongodb://***:***@');
  console.log(`🔗 URI: ${maskedUri}`);
  
  if (dbInfo.isProduction) {
    console.log('\n⚠️  WARNING: You are connected to a PRODUCTION/CLOUD database!');
    console.log('⚠️  Be careful when running tests or scripts!');
  } else {
    console.log('\n✅ Safe - Local database detected');
  }
  
  console.log('='.repeat(70));
  
  // Try to connect
  try {
    console.log('\n🔄 Attempting to connect...');
    await mongoose.connect(dbInfo.uri);
    console.log('✅ Successfully connected to MongoDB');
    
    // Show actual database name after connection
    const db = mongoose.connection.db;
    if (db) {
      console.log(`📊 Connected database: ${db.databaseName}`);
      
      // List collections
      const collections = await db.listCollections().toArray();
      console.log(`📁 Collections found: ${collections.length}`);
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Check connection status
    console.log(`\n📡 Connection Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`🏠 Host: ${mongoose.connection.host}`);
    console.log(`📝 Database: ${mongoose.connection.name}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database connection error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if MongoDB is running (for local)');
    console.log('   2. Verify MONGODB_URI in .env file');
    console.log('   3. Check network connectivity (for cloud)');
    console.log('   4. Verify credentials are correct');
    process.exit(1);
  }
  
  console.log('='.repeat(70) + '\n');
};

// Run the check
checkDatabase().catch(console.error);

