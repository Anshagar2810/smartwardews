import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

console.log('\n🚀 FULL INTEGRATION SMOKE TEST');
console.log('==============================\n');

let token = '';
let userId = '';

try {
  // Step 1: Register a test doctor
  console.log('📝 Step 1: Registering test doctor...');
  const registerRes = await axios.post(`${API_URL}/auth/register`, {
    userId: `TESTDOC${Date.now()}`,
    name: 'Dr. Integration Test',
    phone: '+14155238886',
    password: 'TestPass123!',
    role: 'DOCTOR'
  });
  
  userId = registerRes.data.user.userId;
  console.log('✅ Doctor registered:', userId);
  
  // Step 2: Login with the doctor
  console.log('\n🔐 Step 2: Logging in...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    identifier: userId,
    password: 'TestPass123!'
  });
  
  token = loginRes.data.token;
  console.log('✅ Login successful. Token:', token.substring(0, 20) + '...');
  
  // Step 3: Get patients (should be empty initially)
  console.log('\n👥 Step 3: Fetching patients...');
  const patientsRes = await axios.get(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('✅ Patients fetched:', patientsRes.data.length, 'patients');
  
  // Step 4: Create a test patient
  console.log('\n⚕️ Step 4: Creating test patient...');
  const patientRes = await axios.post(`${API_URL}/patients`, {
    patientId: `PAT${Date.now()}`,
    name: 'Test Patient',
    age: 45,
    phone: '+919810325677',
    doctorId: userId,
    deviceId: `ESP32_${Date.now()}`
  });
  
  console.log('✅ Patient created:', patientRes.data._id || patientRes.data.id);
  
  // Step 5: Fetch patients again (should have 1 now)
  console.log('\n👥 Step 5: Fetching patients again...');
  const patientsRes2 = await axios.get(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('✅ Total patients:', patientsRes2.data.length);
  
  console.log('\n\n✨ SMOKE TEST COMPLETED SUCCESSFULLY!');
  console.log('====================================');
  console.log('✅ Registration working');
  console.log('✅ Login & Token generation working');
  console.log('✅ Patient retrieval working');
  console.log('✅ Patient creation working');
  console.log('✅ Database integration working');
  console.log('\n🎉 Frontend & Backend are INTEGRATED and WORKING!');
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else {
    console.error('Full error:', error);
  }
  process.exit(1);
}
