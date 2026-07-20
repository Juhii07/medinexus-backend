import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  addPatient, getPatients, getPatientById,
  updatePatient, deletePatient, togglePatientStatus,
} from "../controllers/patientController.js";

const router = express.Router();

router.post("/", protect, addPatient);
router.get("/", protect, getPatients);
router.get("/:id", protect, getPatientById);
router.put("/:id", protect, updatePatient);
router.delete("/:id", protect, deletePatient);
router.patch("/:id/toggle-status", protect, togglePatientStatus);

export default router;