import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    doctorName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    qualification: { type: String, required: true },
    experience: { type: Number, required: true },
    consultationFee: { type: Number, required: true },
    address: { type: String, required: true },
    status: { type: Boolean, default: true },
    availability: {
      workingDays: {
        type: [String],
        enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      },
      startTime: { type: String, default: "09:00" },
      endTime: { type: String, default: "17:00" },
      slotDurationMinutes: { type: Number, default: 30 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);