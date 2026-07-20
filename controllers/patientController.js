import Patient from "../models/Patient.js";

export const addPatient = async (req, res) => {
  try {
    const emailExist = await Patient.findOne({ email: req.body.email });
    if (emailExist) return res.status(400).json({ success: false, message: "Patient with this email already exists" });
    const patient = await Patient.create({ ...req.body, registeredBy: req.user._id });
    res.status(201).json({ success: true, message: "Patient Added Successfully", patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPatients = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }
    if (status !== undefined && status !== "") query.status = status === "true";
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, message: "Patient Updated", patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePatient = async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Patient Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePatientStatus = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    patient.status = !patient.status;
    await patient.save();
    res.json({ success: true, message: `Patient ${patient.status ? "Activated" : "Deactivated"}`, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};