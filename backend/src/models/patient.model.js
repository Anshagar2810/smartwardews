import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true, // PAT001
    },

    name: String,
    age: Number,
    phone: String,

    doctorId: {
      type: String, // DOC001 (NOT ObjectId)
      required: true,
    },

    deviceId: {
      type: String, // ESP32_001
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Patient", patientSchema);