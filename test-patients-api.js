import connectDB from "./backend/src/config/db.js";
import Patient from "./backend/src/models/patient.model.js";
import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });

async function run() {
  await connectDB();
  const patients = await Patient.find().limit(1).lean();
  console.log(JSON.stringify(patients, null, 2));
  process.exit(0);
}
run();
