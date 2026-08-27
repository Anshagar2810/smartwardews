import connectDB from "./src/config/db.js";
import Vitals from "./src/models/vitals.model.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function run() {
  await connectDB();
  const vitals = await Vitals.find().sort({createdAt: -1}).limit(5);
  console.log(JSON.stringify(vitals, null, 2));
  process.exit(0);
}
run();
