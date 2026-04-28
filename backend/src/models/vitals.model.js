import mongoose from "mongoose";

const vitalsSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    deviceId: {
      type: String,
      required: true,
    },

    heartRate: Number,
    spo2: Number,

    // 🌡 Temperature stored in FAHRENHEIT
    temperature: Number,

    source: {
      type: String,
      default: "ThingSpeak",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vitals", vitalsSchema);