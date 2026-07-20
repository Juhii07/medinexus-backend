import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "appointment_booked",
        "appointment_cancelled",
        "appointment_completed",
        "appointment_reminder",
        "payment_received",
        "low_stock",
        "system",
      ],
      default: "system",
    },
    isRead: { type: Boolean, default: false },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);