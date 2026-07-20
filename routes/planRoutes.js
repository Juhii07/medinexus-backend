import express from "express";
import protect, { adminOnly } from "../middleware/authMiddleware.js";
import {
  createPlan,
  getAllPlans,
  getActivePlans,
  getPlanById,
  updatePlan,
  deletePlan,
  togglePlanStatus,
  getPlanStats,
  getAllSubscriptions,
} from "../controllers/planController.js";

const router = express.Router();

// Public — active plans (anyone can view to subscribe)
router.get("/active", getActivePlans);

// Protected — admin only
router.post("/",                 protect, adminOnly, createPlan);
router.get("/",                  protect, adminOnly, getAllPlans);
router.get("/stats",             protect, adminOnly, getPlanStats);
router.get("/subscriptions",     protect, adminOnly, getAllSubscriptions);
router.get("/:id",               protect, getPlanById);
router.put("/:id",               protect, adminOnly, updatePlan);
router.delete("/:id",            protect, adminOnly, deletePlan);
router.patch("/:id/toggle",      protect, adminOnly, togglePlanStatus);

export default router;
