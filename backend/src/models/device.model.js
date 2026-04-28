import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true
    },

    assignedPatient: {
      type: String
    },

    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "OFFLINE"
    },

    lastSeen: {
      type: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);