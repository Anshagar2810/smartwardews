import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://smartward_user:IK24UXY3fRqkfjHh@cluster0.590qjf6.mongodb.net/smartward?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.error(`❌ Error details:`, err);
    console.log('⚠️ Starting server without database connection - API will still run');
  }
};

export default connectDB;
