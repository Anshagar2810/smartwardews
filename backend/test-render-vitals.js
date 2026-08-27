import axios from 'axios';
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function run() {
  try {
    // 1. hit localhost login
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      email: "yourgmail@gmail.com",
      password: "admin"
    });
    const token = loginRes.data.token;
    
    // 2. hit render API
    const vitalsRes = await axios.get('https://smart-ward-backend-n2as.onrender.com/api/vitals/PAT001', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Latest vitals from Render:", JSON.stringify(vitalsRes.data[0], null, 2));
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}
run();
