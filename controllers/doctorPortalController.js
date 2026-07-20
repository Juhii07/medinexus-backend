import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";

// Helper — find the Doctor record linked to the logged-in user's email
const findLinkedDoctor = async (req) => {
  return Doctor.findOne({ email: req.user.email });
};

// GET /doctor-portal/profile
export const getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await findLinkedDoctor(req).then((d) =>
      d ? d.populate("department", "departmentName") : d
    );

    if (!doctor) {
      return res.json({
        success: true,
        linked: false,
        doctor: null,
        message:
          "No doctor record is linked to this account yet. Ask an admin to add you as a doctor using this email address.",
      });
    }

    res.json({
      success: true,
      linked: true,
      doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /doctor-portal/stats
export const getMyStats = async (req, res) => {
  try {
    const doctor = await findLinkedDoctor(req);

    if (!doctor) {
      return res.json({
        success: true,
        stats: { today: 0, upcoming: 0, completed: 0, totalPatients: 0 },
      });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [today, upcoming, completed, patientIds] = await Promise.all([
      Appointment.countDocuments({
        doctor: doctor._id,
        appointmentDate: { $gte: start, $lte: end },
        status: { $ne: "Cancelled" },
      }),
      Appointment.countDocuments({
        doctor: doctor._id,
        appointmentDate: { $gt: end },
        status: "Scheduled",
      }),
      Appointment.countDocuments({
        doctor: doctor._id,
        status: "Completed",
      }),
      Appointment.distinct("patient", { doctor: doctor._id }),
    ]);

    res.json({
      success: true,
      stats: {
        today,
        upcoming,
        completed,
        totalPatients: patientIds.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /doctor-portal/appointments?filter=today|upcoming|completed|all
export const getMyDoctorAppointments = async (req, res) => {
  try {
    const doctor = await findLinkedDoctor(req);

    if (!doctor) {
      return res.json({ success: true, appointments: [] });
    }

    const { filter } = req.query;
    const query = { doctor: doctor._id };

    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: start, $lte: end };
      query.status = { $ne: "Cancelled" };
    } else if (filter === "upcoming") {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gt: end };
      query.status = "Scheduled";
    } else if (filter === "completed") {
      query.status = "Completed";
    }

    const appointments = await Appointment.find(query)
      .populate("patient", "fullName mobile email gender dob bloodGroup")
      .populate("department", "departmentName")
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PATCH /doctor-portal/appointments/:id/status
export const updateMyAppointmentStatus = async (req, res) => {
  try {
    const doctor = await findLinkedDoctor(req);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "No doctor profile linked to this account",
      });
    }

    const { status } = req.body;
    const allowed = ["Completed", "No-Show", "Cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowed.join(", ")}`,
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: doctor._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    appointment.status = status;
    await appointment.save();

    res.json({
      success: true,
      message: `Appointment marked as ${status}`,
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /doctor-portal/appointments/:id
export const getMyDoctorAppointmentById = async (req, res) => {
  try {
    const doctor = await findLinkedDoctor(req);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "No doctor profile linked to this account",
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: doctor._id,
    })
      .populate("patient", "fullName mobile email gender dob bloodGroup medicalHistory")
      .populate("department", "departmentName");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};