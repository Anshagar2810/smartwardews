import connectDB from "./src/config/db.js";
import User from "./src/models/user.model.js";
import jwt from "jsonwebtoken";
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function run() {
  await connectDB();
  const user = await User.findOne();
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  const vitalsRes = await axios.get('https://smart-ward-backend-n2as.onrender.com/api/vitals/PAT001', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Latest vitals from Render:", JSON.stringify(vitalsRes.data[0], null, 2));
  process.exit(0);
}
run();
