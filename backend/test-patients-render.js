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
  
  const patientsRes = await axios.get('https://smart-ward-backend-n2as.onrender.com/api/patients', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Patients from Render:", JSON.stringify(patientsRes.data, null, 2));
  process.exit(0);
}
run();
