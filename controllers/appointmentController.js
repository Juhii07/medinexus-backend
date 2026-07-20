import Appointment from "../models/Appointment.js";
import Billing from "../models/Billing.js";

export const addAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.create({ ...req.body, createdBy: req.user._id });
    const populated = await appointment.populate([
      { path: "patient", select: "fullName mobile email" },
      { path: "doctor", select: "doctorName qualification" },
      { path: "department", select: "departmentName" },
    ]);
    res.status(201).json({ success: true, message: "Appointment Booked", appointment: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAppointments = async (req, res) => {
  try {
    const { status, doctor, date, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (doctor) query.doctor = doctor;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.appointmentDate = { $gte: start, $lt: end };
    }
    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate("patient", "fullName mobile email")
      .populate("doctor", "doctorName qualification")
      .populate("department", "departmentName")
      .sort({ appointmentDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, appointments, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "fullName mobile email gender dob bloodGroup")
      .populate("doctor", "doctorName qualification consultationFee")
      .populate("department", "departmentName");
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("patient", "fullName mobile")
      .populate("doctor", "doctorName")
      .populate("department", "departmentName");
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    res.json({ success: true, message: "Appointment Updated", appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, diagnosis, prescription, followUpDate, consultationNotes } = req.body;
    const update = { status };
    if (diagnosis !== undefined) update.diagnosis = diagnosis;
    if (prescription !== undefined) update.prescription = prescription;
    if (followUpDate !== undefined) update.followUpDate = followUpDate;
    if (consultationNotes !== undefined) update.consultationNotes = consultationNotes;
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    res.json({ success: true, message: `Appointment marked as ${status}`, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Appointment Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodayAppointments = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const appointments = await Appointment.find({ appointmentDate: { $gte: start, $lte: end } })
      .populate("patient", "fullName mobile")
      .populate("doctor", "doctorName")
      .populate("department", "departmentName")
      .sort({ appointmentTime: 1 });
    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBillableAppointments = async (req, res) => {
  try {
    const billedAppointmentIds = await Billing.distinct("appointment", { appointment: { $ne: null } });

    const appointments = await Appointment.find({
      status: "Completed",
      _id: { $nin: billedAppointmentIds },
    })
      .populate("patient", "fullName mobile email")
      .populate("doctor", "doctorName consultationFee")
      .populate("department", "departmentName")
      .sort("-appointmentDate");

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};