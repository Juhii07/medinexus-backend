import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) return res.status(401).json({ success: false, message: "User not found" });
      return next();
    }
    return res.status(401).json({ success: false, message: "No token provided" });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ success: false, message: "Admin access required" });
};

export const doctorOnly = (req, res, next) => {
  if (req.user?.role === "doctor") return next();
  return res.status(403).json({ success: false, message: "Doctor access required" });
};

export const patientOnly = (req, res, next) => {
  if (req.user?.role === "patient") return next();
  return res.status(403).json({ success: false, message: "Patient access required" });
};

export const adminOrReceptionist = (req, res, next) => {
  if (["admin", "receptionist"].includes(req.user?.role)) return next();
  return res.status(403).json({ success: false, message: "Access denied" });
};

export default protect;