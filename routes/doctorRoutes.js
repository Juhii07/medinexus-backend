import express from "express";
import protect, { adminOnly } from "../middleware/authMiddleware.js";

import {
  addDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";

const router = express.Router();

router.post("/", protect, adminOnly, addDoctor);

router.get("/", protect, getDoctors);

router.get("/:id", protect, getDoctorById);

router.put("/:id", protect, adminOnly, updateDoctor);

router.delete("/:id", protect, adminOnly, deleteDoctor);

export default router;