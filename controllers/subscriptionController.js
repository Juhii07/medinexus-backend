import crypto from "crypto";
import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import SubscriptionPayment from "../models/SubscriptionPayment.js";
import getRazorpay from "../utils/razorpay.js";
import { createNotification } from "./notificationController.js";

// ── CREATE RAZORPAY ORDER for plan subscription
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    if (plan.planStatus !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "This plan is not available" });
    }

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: plan.planPrice * 100, // paise
      currency: "INR",
      receipt: `medinexus_plan_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      success: true,
      order,
      plan: {
        _id: plan._id,
        planName: plan.planName,
        planPrice: plan.planPrice,
        planDuration: plan.planDuration,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("createSubscriptionOrder error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planId,
      amount,
    } = req.body;

    // Signature check
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    // Save payment record
    await SubscriptionPayment.create({
      userId: req.user._id,
      planId,
      amount,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentStatus: "COMPLETED",
    });

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.planDuration * 30);

    // Upsert subscription
    await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        planId,
        subscribedDate: new Date(),
        expiryDate,
        status: "ACTIVE",
      },
      { upsert: true, new: true }
    );

    await createNotification({
      userId: req.user._id,
      title: "Subscription Activated 🎉",
      message: `Your ${plan.planName} plan is now active for ${plan.planDuration} month${plan.planDuration > 1 ? "s" : ""}. Expires on ${expiryDate.toLocaleDateString("en-IN")}.`,
      type: "system",
    });

    res.json({
      success: true,
      message: "Payment verified and subscription activated",
      expiryDate,
    });
  } catch (error) {
    console.error("verifySubscriptionPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET MY SUBSCRIPTION (current user)
export const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id })
      .populate("planId", "planName planPrice planDuration features");

    // Also get last subscription for renew logic
    const lastSubscription = await Subscription.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("planId", "planName planPrice planDuration");

    // Auto-expire if past expiry date
    if (subscription && subscription.expiryDate < new Date() && subscription.status === "ACTIVE") {
      subscription.status = "EXPIRED";
      await subscription.save();
    }

    const activeSubscription = subscription?.status === "ACTIVE" ? subscription : null;

    res.json({
      success: true,
      subscription: activeSubscription,
      lastSubscription: subscription?.status !== "ACTIVE" ? lastSubscription : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── CANCEL SUBSCRIPTION
export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: "ACTIVE",
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: "No active subscription found" });
    }

    subscription.status = "INACTIVE";
    await subscription.save();

    res.json({ success: true, message: "Subscription cancelled" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET MY PAYMENT HISTORY
export const getMyPaymentHistory = async (req, res) => {
  try {
    const payments = await SubscriptionPayment.find({ userId: req.user._id })
      .populate("planId", "planName planPrice planDuration")
      .sort({ createdAt: -1 });

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET ALL SUBSCRIPTION PAYMENTS (admin)
export const getAllSubscriptionPayments = async (req, res) => {
  try {
    const payments = await SubscriptionPayment.find()
      .populate("userId", "fullName email role")
      .populate("planId", "planName planPrice planDuration")
      .sort({ createdAt: -1 });

    const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);

    res.json({ success: true, payments, totalRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};