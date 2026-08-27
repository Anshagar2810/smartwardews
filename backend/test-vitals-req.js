import axios from 'axios';

async function run() {
  try {
    const res = await axios.get('https://smart-ward-backend-n2as.onrender.com/api/vitals/PAT001');
    console.log(res.data);
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}
run();
