import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Billing from "../models/Billing.js";
import crypto from "crypto";
import razorpay from "../utils/razorpay.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeToMinutes(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor || doctor.status === false) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const requestedDate = new Date(`${date}T00:00:00`);
    const weekday = WEEKDAYS[requestedDate.getDay()];

    const { workingDays, startTime, endTime, slotDurationMinutes } = doctor.availability || {};

    if (!workingDays || !workingDays.includes(weekday)) {
      return res.json({ success: true, isWorkingDay: false, slots: [] });
    }

    const startMinutes = timeToMinutes(startTime || "09:00");
    const endMinutes = timeToMinutes(endTime || "17:00");
    const duration = slotDurationMinutes || 30;

    const allSlots = [];
    for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
      allSlots.push(minutesToTime(t));
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "Cancelled" },
    }).select("appointmentTime");

    const bookedTimes = new Set(bookedAppointments.map((a) => a.appointmentTime));

    const now = new Date();
    const isToday = dayStart.toDateString() === now.toDateString();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const availableSlots = allSlots.filter((slot) => {
      if (bookedTimes.has(slot)) return false;
      if (isToday && timeToMinutes(slot) <= nowMinutes) return false;
      return true;
    });

    res.json({ success: true, isWorkingDay: true, slots: availableSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    res.json({ success: true, needsProfile: !patient, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveMyProfile = async (req, res) => {
  try {
    const { mobile, gender, dob, bloodGroup, address, medicalHistory, emergencyContact } = req.body;

    if (!mobile || !gender || !dob) {
      return res.status(400).json({ success: false, message: "Mobile, gender and date of birth are required" });
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        mobile,
        gender,
        dob,
        bloodGroup,
        address,
        medicalHistory,
        emergencyContact,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, message: "Profile saved successfully", patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.json({ success: true, appointments: [] });

    const appointments = await Appointment.find({ patient: patient._id })
      .populate("doctor", "doctorName qualification consultationFee")
      .populate("department", "departmentName")
      .sort("-appointmentDate");

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bookMyAppointment = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });

    if (!patient) {
      return res.status(400).json({ success: false, message: "Please complete your profile before booking an appointment" });
    }

    const { doctor, appointmentDate, appointmentTime, type, symptoms, notes } = req.body;

    if (!doctor || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, message: "Doctor, date and time are required" });
    }

    const doctorDoc = await Doctor.findById(doctor);

    if (!doctorDoc) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const conflict = await Appointment.findOne({
      doctor: doctorDoc._id,
      appointmentDate,
      appointmentTime,
      status: { $ne: "Cancelled" },
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: "This time slot has just been booked. Please pick another." });
    }

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctorDoc._id,
      department: doctorDoc.department,
      appointmentDate,
      appointmentTime,
      type,
      symptoms,
      notes,
      consultationFee: doctorDoc.consultationFee,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: "Appointment booked successfully", appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelMyAppointment = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });

    const appointment = await Appointment.findOne({ _id: req.params.id, patient: patient._id });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (appointment.status !== "Scheduled") {
      return res.status(400).json({ success: false, message: "Only scheduled appointments can be cancelled" });
    }

    appointment.status = "Cancelled";
    await appointment.save();

    res.json({ success: true, message: "Appointment cancelled", appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBills = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.json({ success: true, bills: [] });

    const bills = await Billing.find({ patient: patient._id }).sort("-billDate");
    res.json({ success: true, bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBillById = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ success: false, message: "Patient profile not found" });

    const bill = await Billing.findOne({ _id: req.params.id, patient: patient._id });
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    res.json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPaymentOrder = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const bill = await Billing.findOne({ _id: req.params.billId, patient: patient._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    if (bill.dueAmount <= 0) {
      return res.status(400).json({ success: false, message: "This bill is already fully paid" });
    }

    const amountInPaise = Math.round(bill.dueAmount * 100);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
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

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification details" });
    }

    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const bill = await Billing.findOne({ _id: req.params.billId, patient: patient._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

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