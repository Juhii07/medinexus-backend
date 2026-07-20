import Department from "../models/Department.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Billing from "../models/Billing.js";
import Medicine from "../models/Medicine.js";

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDepartments, totalDoctors, totalPatients,
      totalAppointments, todayAppointments, pendingBills,
      lowStockMedicines, revenueData,
    ] = await Promise.all([
      Department.countDocuments({ status: true }),
      Doctor.countDocuments({ status: true }),
      Patient.countDocuments({ status: true }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ appointmentDate: { $gte: today } }),
      Billing.countDocuments({ paymentStatus: { $in: ["Unpaid", "Partial"] } }),
      Medicine.countDocuments({ $expr: { $lte: ["$quantity", "$reorderLevel"] } }),
      Billing.aggregate([
        { $match: { paymentStatus: { $in: ["Paid", "Partial"] } } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
    ]);

    const recentAppointments = await Appointment.find()
      .populate("patient", "fullName")
      .populate("doctor", "doctorName")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPatients = await Patient.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("fullName email mobile gender createdAt");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Billing.aggregate([
      { $match: { billDate: { $gte: sixMonthsAgo }, paymentStatus: { $in: ["Paid", "Partial"] } } },
      { $group: { _id: { year: { $year: "$billDate" }, month: { $month: "$billDate" } }, total: { $sum: "$paidAmount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalDepartments, totalDoctors, totalPatients,
        totalAppointments, todayAppointments, pendingBills,
        lowStockMedicines, totalRevenue: revenueData[0]?.total || 0,
      },
      recentAppointments,
      recentPatients,
      monthlyRevenue,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};