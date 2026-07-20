import Medicine from "../models/Medicine.js";

export const addMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, message: "Medicine Added", medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { medicineName: { $regex: search, $options: "i" } },
        { genericName: { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.category = category;
    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, medicines, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found" });
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found" });
    res.json({ success: true, message: "Medicine Updated", medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Medicine Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { quantity, action } = req.body;
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found" });
    if (action === "add") {
      medicine.quantity += Number(quantity);
    } else if (action === "subtract") {
      if (medicine.quantity < quantity) return res.status(400).json({ success: false, message: "Insufficient stock" });
      medicine.quantity -= Number(quantity);
    }
    await medicine.save();
    res.json({ success: true, message: "Stock Updated", medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLowStockMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({ $expr: { $lte: ["$quantity", "$reorderLevel"] }, status: true }).sort({ quantity: 1 });
    res.json({ success: true, medicines, count: medicines.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpiringMedicines = async (req, res) => {
  try {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    const medicines = await Medicine.find({ expiryDate: { $gte: today, $lte: in30Days }, status: true }).sort({ expiryDate: 1 });
    res.json({ success: true, medicines, count: medicines.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};