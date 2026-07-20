import crypto from "crypto";
import Billing from "../models/Billing.js";
import Patient from "../models/Patient.js";
import getRazorpay from "../utils/razorpay.js";
import { createNotification } from "./notificationController.js";

// ─────────────────────────────────────────────────────────────────
// SIMULATED CARD CHARGE (existing, kept as-is for card payments)
// ─────────────────────────────────────────────────────────────────
const simulateCardCharge = ({ cardNumber, expiry, cvv }) => {
  const digitsOnly = (cardNumber || "").replace(/\s/g, "");
  if (digitsOnly.length < 12 || digitsOnly.length > 19)
    return { success: false, message: "Enter a valid card number" };
  if (!/^\d{2}\/\d{2}$/.test(expiry || ""))
    return { success: false, message: "Expiry must be in MM/YY format" };
  if (!/^\d{3,4}$/.test(cvv || ""))
    return { success: false, message: "Enter a valid CVV" };
  if (digitsOnly.endsWith("0000"))
    return { success: false, message: "Card declined by issuing bank" };
  return {
    success: true,
    transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  };
};

// ─────────────────────────────────────────────────────────────────
// CREATE RAZORPAY ORDER for bill payment
// ─────────────────────────────────────────────────────────────────
export const createBillOrder = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });

    const bill = await Billing.findOne({ _id: req.params.billId, patient: patient._id });
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    if (bill.paymentStatus === "Paid")
      return res.status(400).json({ success: false, message: "Bill is already fully paid" });

    const { amount } = req.body;
    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0)
      return res.status(400).json({ success: false, message: "Enter a valid amount" });
    if (payAmount > bill.dueAmount)
      return res.status(400).json({ success: false, message: `Amount cannot exceed due amount (₹${bill.dueAmount})` });

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: payAmount * 100,
      currency: "INR",
      receipt: `medinexus_bill_${bill._id}_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({
      success: true,
      order,
      bill: { invoiceNumber: bill.invoiceNumber, dueAmount: bill.dueAmount },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// VERIFY RAZORPAY BILL PAYMENT
// ─────────────────────────────────────────────────────────────────
export const verifyBillPayment = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });

    const bill = await Billing.findOne({ _id: req.params.billId, patient: patient._id });
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const payAmount = Number(amount);
    bill.paidAmount += payAmount;
    bill.dueAmount = bill.totalAmount - bill.paidAmount;
    bill.paymentStatus = bill.dueAmount <= 0 ? "Paid" : "Partial";
    bill.paymentMethod = "UPI";
    await bill.save();

    await createNotification({
      userId: req.user._id,
      title: "Payment Successful ✅",
      message: `₹${payAmount} paid for invoice ${bill.invoiceNumber} via Razorpay. ${bill.dueAmount > 0 ? `₹${bill.dueAmount} still due.` : "Fully paid!"}`,
      type: "payment_received",
      referenceId: bill._id,
    });

    res.json({
      success: true,
      message: "Payment verified and recorded",
      transactionId: razorpayPaymentId,
      bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// CARD PAYMENT (existing simulated flow — kept)
// ─────────────────────────────────────────────────────────────────
export const payMyBill = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });

    const bill = await Billing.findOne({ _id: req.params.billId, patient: patient._id });
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    if (bill.paymentStatus === "Paid")
      return res.status(400).json({ success: false, message: "This bill is already fully paid" });

    const { amount, cardNumber, cardName, expiry, cvv } = req.body;
    const payAmount = Number(amount);

    if (!payAmount || payAmount <= 0)
      return res.status(400).json({ success: false, message: "Enter a valid amount" });
    if (payAmount > bill.dueAmount)
      return res.status(400).json({ success: false, message: `Amount cannot exceed the due amount (₹${bill.dueAmount})` });
    if (!cardName)
      return res.status(400).json({ success: false, message: "Cardholder name is required" });

    const charge = simulateCardCharge({ cardNumber, expiry, cvv });
    if (!charge.success)
      return res.status(402).json({ success: false, message: charge.message });

    bill.paidAmount += payAmount;
    bill.dueAmount = bill.totalAmount - bill.paidAmount;
    bill.paymentStatus = bill.dueAmount <= 0 ? "Paid" : "Partial";
    bill.paymentMethod = "Card";
    await bill.save();

    await createNotification({
      userId: req.user._id,
      title: "Payment Successful",
      message: `₹${payAmount} paid towards invoice ${bill.invoiceNumber}. ${bill.dueAmount > 0 ? `₹${bill.dueAmount} still due.` : "Fully paid."}`,
      type: "payment_received",
      referenceId: bill._id,
    });

    res.json({
      success: true,
      message: "Payment successful",
      transactionId: charge.transactionId,
      bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};