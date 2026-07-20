import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createBill, createBillFromAppointment, getBills, getBillById,
  updatePayment, deleteBill, getRevenueSummary,
  createStaffPaymentOrder, verifyStaffPayment,
} from "../controllers/billingController.js";

const router = express.Router();

router.post("/", protect, createBill);
router.post("/from-appointment/:appointmentId", protect, createBillFromAppointment);
router.get("/", protect, getBills);
router.get("/revenue-summary", protect, getRevenueSummary);
router.get("/:id", protect, getBillById);
router.patch("/:id/payment", protect, updatePayment);
router.post("/:id/create-order", protect, createStaffPaymentOrder);
router.post("/:id/verify-payment", protect, verifyStaffPayment);
router.delete("/:id", protect, deleteBill);

export default router;