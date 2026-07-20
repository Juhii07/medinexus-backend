import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    planDuration: {
      type: Number,
      required: true, // in months
    },
    planPrice: {
      type: Number,
      required: true,
    },
    features: {
      type: [String],
      default: [
        "Unlimited Patient Records",
        "Doctor Management",
        "Appointment Booking",
        "Billing & Invoicing",
        "Medicine Inventory",
        "Reports & Analytics",
      ],
    },
    planStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);