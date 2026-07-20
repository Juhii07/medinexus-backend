import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";

// ── CREATE PLAN (admin only)
export const createPlan = async (req, res) => {
  try {
    const { planName, planDuration, planPrice, features } = req.body;

    if (!planName || !planDuration || !planPrice) {
      return res.status(400).json({
        success: false,
        message: "Plan name, duration and price are required",
      });
    }

    const plan = await Plan.create({
      planName,
      planDuration: Number(planDuration),
      planPrice: Number(planPrice),
      features: features || undefined,
      addedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: "Plan created", plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET ALL PLANS (any authenticated user — needed for subscribe page)
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET ACTIVE PLANS ONLY (public endpoint for subscribe page)
export const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ planStatus: "ACTIVE" }).sort({ planPrice: 1 });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET SINGLE PLAN
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── UPDATE PLAN (admin only)
export const updatePlan = async (req, res) => {
  try {
    const { planName, planDuration, planPrice, features } = req.body;
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { planName, planDuration: Number(planDuration), planPrice: Number(planPrice), features },
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    res.json({ success: true, message: "Plan updated", plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE PLAN (admin only)
export const deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Plan deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── TOGGLE PLAN STATUS (admin only)
export const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    plan.planStatus = plan.planStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await plan.save();
    res.json({ success: true, message: "Status updated", plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET PLAN STATS (admin — how many subscriptions per plan)
export const getPlanStats = async (req, res) => {
  try {
    const plans = await Plan.find();
    const stats = await Promise.all(
      plans.map(async (plan) => {
        const count = await Subscription.countDocuments({
          planId: plan._id,
          status: "ACTIVE",
        });
        return {
          planId: plan._id,
          planName: plan.planName,
          activeSubscriptions: count,
        };
      })
    );
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET ALL SUBSCRIPTIONS (admin view)
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("userId", "fullName email role mobile")
      .populate("planId", "planName planPrice planDuration")
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};