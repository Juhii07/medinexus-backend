import express from "express";
import crypto from "crypto";
import getRazorpay from "../utils/razorpay.js";
import protect, { patientOnly } from "../middleware/authMiddleware.js";
import {
  getDoctorSlots,
  getMyProfile,
  saveMyProfile,
  getMyAppointments,
  bookMyAppointment,
  cancelMyAppointment,
  getMyBills,
  getMyBillById,
  createPaymentOrder,
  verifyPayment,
} from "../controllers/patientPortalController.js";

const router = express.Router();

router.use(protect, patientOnly);

router.get("/doctors/:doctorId/slots", getDoctorSlots);
router.get("/profile", getMyProfile);
router.put("/profile", saveMyProfile);
router.get("/appointments", getMyAppointments);
router.post("/appointments", bookMyAppointment);
router.patch("/appointments/:id/cancel", cancelMyAppointment);
router.get("/bills", getMyBills);
router.get("/bills/:id", getMyBillById);
router.post("/bills/:billId/create-order", createPaymentOrder);
router.post("/bills/:billId/verify-payment", verifyPayment);

export default router;