import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://smartward_user:IK24UXY3fRqkfjHh@cluster0.590qjf6.mongodb.net/smartward?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.log('⚠️ Starting server without database connection - API will still run');
  }
};

export default connectDB;
