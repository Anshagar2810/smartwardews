import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = "mongodb+srv://smartward_user:IK24UXY3fRqkfjHh@cluster0.590qjf6.mongodb.net/smartward?retryWrites=true&w=majority";

async function checkUsers() {
    await mongoose.connect(MONGO_URI);
    const users = await User.find({});
    console.log('--- Current Users in Database ---');
    users.forEach(u => {
        console.log(`- ${u.name} (${u.email}) | Role: ${u.role} | ID: ${u.userId}`);
    });
    process.exit();
}

checkUsers();
