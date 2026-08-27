import connectDB from "./src/config/db.js";
import Patient from "./src/models/patient.model.js";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function run() {
  await connectDB();
  const patients = await Patient.find().limit(1).lean();
  console.log(JSON.stringify(patients, null, 2));
  process.exit(0);
}
run();
