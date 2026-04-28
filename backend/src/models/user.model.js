import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  phone: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    enum: ["ADMIN", "DOCTOR", "NURSE"],
    required: true,
  },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;