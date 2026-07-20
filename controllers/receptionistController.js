import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Billing from "../models/Billing.js";

export const getReceptionistDashboard = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [
      todayAppointments,
      scheduledToday,
      completedToday,
      pendingBillsCount,
      pendingBillsAmount,
      recentPatients,
    ] = await Promise.all([
      Appointment.find({ appointmentDate: { $gte: start, $lte: end } })
        .populate("patient", "fullName mobile")
        .populate("doctor", "doctorName")
        .populate("department", "departmentName")
        .sort({ appointmentTime: 1 }),
      Appointment.countDocuments({
        appointmentDate: { $gte: start, $lte: end },
        status: "Scheduled",
      }),
      Appointment.countDocuments({
        appointmentDate: { $gte: start, $lte: end },
        status: "Completed",
      }),
      Billing.countDocuments({ paymentStatus: { $in: ["Unpaid", "Partial"] } }),
      Billing.aggregate([
        { $match: { paymentStatus: { $in: ["Unpaid", "Partial"] } } },
        { $group: { _id: null, total: { $sum: "$dueAmount" } } },
      ]),
      Patient.find().sort({ createdAt: -1 }).limit(5).select("fullName mobile gender createdAt"),
    ]);

    res.json({
      success: true,
      stats: {
        totalToday: todayAppointments.length,
        scheduledToday,
        completedToday,
        pendingBillsCount,
        pendingBillsAmount: pendingBillsAmount[0]?.total || 0,
      },
      todayAppointments,
      recentPatients,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};