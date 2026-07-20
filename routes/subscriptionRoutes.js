import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getMySubscription,
  cancelSubscription,
  getMyPaymentHistory,
  getAllSubscriptionPayments,
} from "../controllers/subscriptionController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order",       protect, createSubscriptionOrder);
router.post("/verify-payment",     protect, verifySubscriptionPayment);
router.get("/my-subscription",     protect, getMySubscription);
router.put("/cancel",              protect, cancelSubscription);
router.get("/my-payments",         protect, getMyPaymentHistory);
router.get("/all-payments",        protect, adminOnly, getAllSubscriptionPayments);

export default router;