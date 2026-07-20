import express from "express";
import protect, { doctorOnly } from "../middleware/authMiddleware.js";

import {
  getMyDoctorProfile,
  getMyStats,
  getMyDoctorAppointments,
  getMyDoctorAppointmentById,
  updateMyAppointmentStatus,
} from "../controllers/doctorPortalController.js";

const router = express.Router();

router.use(protect, doctorOnly);

router.get("/profile", getMyDoctorProfile);
router.get("/stats", getMyStats);

router.get("/appointments", getMyDoctorAppointments);
router.get("/appointments/:id", getMyDoctorAppointmentById);
router.patch("/appointments/:id/status", updateMyAppointmentStatus);

export default router;