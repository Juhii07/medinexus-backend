import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    genericName: { type: String, default: "" },
    category: {
      type: String,
      enum: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Other"],
      required: true,
    },
    manufacturer: { type: String, default: "" },
    batchNumber: { type: String, default: "" },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, default: 0 },
    purchasePrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    description: { type: String, default: "" },
    status: { type: Boolean, default: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Medicine", medicineSchema);