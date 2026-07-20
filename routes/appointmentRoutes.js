import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  addAppointment, getAppointments, getAppointmentById,
  updateAppointment, updateAppointmentStatus,
  deleteAppointment, getTodayAppointments,
  getBillableAppointments,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.post("/", protect, addAppointment);
router.get("/", protect, getAppointments);
router.get("/today", protect, getTodayAppointments);
router.get("/billable", protect, getBillableAppointments);
router.get("/:id", protect, getAppointmentById);
router.put("/:id", protect, updateAppointment);
router.patch("/:id/status", protect, updateAppointmentStatus);
router.delete("/:id", protect, deleteAppointment);

export default router;