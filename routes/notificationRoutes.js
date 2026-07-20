import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getMyNotifications, markAsRead, markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/mark-all-read", protect, markAllAsRead);

export default router;