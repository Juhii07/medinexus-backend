import express from "express";
import protect, { adminOrReceptionist } from "../middleware/authMiddleware.js";
import { getReceptionistDashboard } from "../controllers/receptionistController.js";

const router = express.Router();

router.get("/dashboard", protect, adminOrReceptionist, getReceptionistDashboard);

export default router;