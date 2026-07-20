import express from "express";
import {
  register, login, getProfile, updateMyProfile,
  changeMyPassword, forgotPassword, resetPassword,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateMyProfile);
router.put("/change-password", protect, changeMyPassword);

export default router;