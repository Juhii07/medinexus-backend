import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  addMedicine, getMedicines, getMedicineById,
  updateMedicine, deleteMedicine, updateStock,
  getLowStockMedicines, getExpiringMedicines,
} from "../controllers/medicineController.js";

const router = express.Router();

router.post("/", protect, addMedicine);
router.get("/", protect, getMedicines);
router.get("/low-stock", protect, getLowStockMedicines);
router.get("/expiring", protect, getExpiringMedicines);
router.get("/:id", protect, getMedicineById);
router.put("/:id", protect, updateMedicine);
router.patch("/:id/stock", protect, updateStock);
router.delete("/:id", protect, deleteMedicine);

export default router;