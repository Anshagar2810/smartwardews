import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },

    vitalsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vitals",
    },

    riskLevel: String,
    messages: [String],
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Alert", alertSchema);