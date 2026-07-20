import express from "express";
import protect, { patientOnly } from "../middleware/authMiddleware.js";
import { createBillOrder, verifyBillPayment, payMyBill } from "../controllers/paymentController.js";

const router = express.Router();

// Razorpay flow (UPI/card via Razorpay)
router.post("/create-bill-order/:billId", protect, patientOnly, createBillOrder);
router.post("/verify-bill/:billId",       protect, patientOnly, verifyBillPayment);

// Simulated card flow (existing)
router.post("/pay/:billId",               protect, patientOnly, payMyBill);

export default router;