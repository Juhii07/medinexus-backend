import Billing from "../models/Billing.js";
import Appointment from "../models/Appointment.js";
import crypto from "crypto";
import getRazorpay from "../utils/razorpay.js";

const generateInvoiceNumber = async () => {
  const count = await Billing.countDocuments();
  const pad = String(count + 1).padStart(5, "0");
  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  return `INV-${month}-${pad}`;
};

function validateGovtCard(paymentMethod, govtCardId) {
  if (paymentMethod === "Government Card" && !govtCardId?.trim()) {
    return "Government Card ID is required when payment method is Government Card";
  }
  return null;
}

export const createBill = async (req, res) => {
  try {
    const { subtotal, discount = 0, tax = 0, paidAmount = 0, services, paymentMethod, govtCardId } = req.body;

    if (!services || services.length === 0) {
      return res.status(400).json({ success: false, message: "At least one service line is required" });
    }

    const cardError = validateGovtCard(paymentMethod, govtCardId);
    if (cardError) {
      return res.status(400).json({ success: false, message: cardError });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const totalAmount = Number(subtotal) - Number(discount) + Number(tax);

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Total amount must be greater than zero" });
    }

    if (Number(paidAmount) > totalAmount) {
      return res.status(400).json({ success: false, message: "Paid amount cannot exceed the total amount" });
    }

    const dueAmount = totalAmount - Number(paidAmount);
    const paymentStatus = paidAmount >= totalAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";

    const bill = await Billing.create({
      ...req.body,
      govtCardId: paymentMethod === "Government Card" ? govtCardId.trim() : "",
      invoiceNumber,
      totalAmount,
      dueAmount,
      paymentStatus,
      createdBy: req.user._id,
    });

    const populated = await bill.populate([{ path: "patient", select: "fullName mobile email" }]);
    res.status(201).json({ success: true, message: "Bill Created", bill: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBillFromAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { discount = 0, tax = 0, paidAmount = 0, paymentMethod = "Pending", govtCardId = "", notes = "" } = req.body;

    const cardError = validateGovtCard(paymentMethod, govtCardId);
    if (cardError) {
      return res.status(400).json({ success: false, message: cardError });
    }

    const appointment = await Appointment.findById(appointmentId).populate("doctor", "doctorName consultationFee");
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const existing = await Billing.findOne({ appointment: appointment._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "This appointment has already been billed" });
    }

    const fee = appointment.consultationFee || appointment.doctor?.consultationFee || 0;

    if (fee <= 0) {
      return res.status(400).json({ success: false, message: "This doctor has no consultation fee set" });
    }

    const services = [
      {
        serviceName: `Consultation — Dr. ${appointment.doctor?.doctorName || "Unknown"}`,
        quantity: 1,
        unitPrice: fee,
        total: fee,
      },
    ];

    const subtotal = fee;
    const totalAmount = subtotal - Number(discount) + Number(tax);

    if (Number(paidAmount) > totalAmount) {
      return res.status(400).json({ success: false, message: "Paid amount cannot exceed the total amount" });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const dueAmount = totalAmount - Number(paidAmount);
    const paymentStatus = paidAmount >= totalAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";

    const bill = await Billing.create({
      patient: appointment.patient,
      appointment: appointment._id,
      invoiceNumber,
      services,
      subtotal,
      discount,
      tax,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMethod,
      govtCardId: paymentMethod === "Government Card" ? govtCardId.trim() : "",
      paymentStatus,
      notes,
      createdBy: req.user._id,
    });

    const populated = await bill.populate("patient", "fullName mobile email");
    res.status(201).json({ success: true, message: "Bill created from appointment", bill: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBills = async (req, res) => {
  try {
    const { paymentStatus, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {};
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate && endDate) query.billDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    const total = await Billing.countDocuments(query);
    const bills = await Billing.find(query)
      .populate("patient", "fullName mobile email")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, bills, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBillById = async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id)
      .populate("patient", "fullName mobile email address gender dob")
      .populate("appointment")
      .populate("createdBy", "fullName");
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    res.json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod, govtCardId } = req.body;
    const bill = await Billing.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    const cardError = validateGovtCard(paymentMethod, govtCardId);
    if (cardError) {
      return res.status(400).json({ success: false, message: cardError });
    }

    const amount = Number(paidAmount);

    if (amount > bill.totalAmount) {
      return res.status(400).json({ success: false, message: "Paid amount cannot exceed the total amount" });
    }

    bill.paidAmount = amount;
    bill.paymentMethod = paymentMethod;
    bill.govtCardId = paymentMethod === "Government Card" ? (govtCardId || "").trim() : "";
    bill.dueAmount = bill.totalAmount - amount;
    bill.paymentStatus = amount >= bill.totalAmount ? "Paid" : amount > 0 ? "Partial" : "Unpaid";
    await bill.save();

    res.json({ success: true, message: "Payment Updated", bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBill = async (req, res) => {
  try {
    await Billing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Bill Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRevenueSummary = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [todayRev, monthRev, totalRev] = await Promise.all([
      Billing.aggregate([{ $match: { billDate: { $gte: today }, paymentStatus: "Paid" } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
      Billing.aggregate([{ $match: { billDate: { $gte: startOfMonth }, paymentStatus: { $in: ["Paid", "Partial"] } } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
      Billing.aggregate([{ $match: { paymentStatus: { $in: ["Paid", "Partial"] } } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
    ]);
    res.json({ success: true, revenue: { today: todayRev[0]?.total || 0, thisMonth: monthRev[0]?.total || 0, total: totalRev[0]?.total || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStaffPaymentOrder = async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    if (bill.dueAmount <= 0) {
      return res.status(400).json({ success: false, message: "This bill is already fully paid" });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(bill.dueAmount * 100),
      currency: "INR",
      receipt: `bill_${bill._id}`,
      notes: { billId: bill._id.toString(), invoiceNumber: bill.invoiceNumber },
    });

    res.json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      bill: { invoiceNumber: bill.invoiceNumber, dueAmount: bill.dueAmount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyStaffPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification details" });
    }

    const bill = await Billing.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed. Signature mismatch." });
    }

    bill.paidAmount = bill.totalAmount;
    bill.dueAmount = 0;
    bill.paymentStatus = "Paid";
    bill.paymentMethod = "Card";
    bill.razorpayOrderId = razorpay_order_id;
    bill.razorpayPaymentId = razorpay_payment_id;
    bill.razorpaySignature = razorpay_signature;
    await bill.save();

    res.json({ success: true, message: "Payment successful", bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};