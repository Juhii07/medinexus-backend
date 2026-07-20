import express from "express";
import protect, { adminOrReceptionist } from "../middleware/authMiddleware.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", protect, adminOrReceptionist, getDashboardStats);

export default router;