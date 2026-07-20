import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes         from "./routes/authRoutes.js";
import departmentRoutes   from "./routes/departmentRoutes.js";
import dashboardRoutes    from "./routes/dashboardRoutes.js";
import doctorRoutes       from "./routes/doctorRoutes.js";
import patientRoutes      from "./routes/patientRoutes.js";
import appointmentRoutes  from "./routes/appointmentRoutes.js";
import medicineRoutes     from "./routes/medicineRoutes.js";
import billingRoutes      from "./routes/billingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import patientPortalRoutes   from "./routes/patientPortalRoutes.js";
import doctorPortalRoutes    from "./routes/doctorPortalRoutes.js";
import receptionistRoutes    from "./routes/receptionistRoutes.js";
import paymentRoutes         from "./routes/paymentRoutes.js";
import planRoutes            from "./routes/planRoutes.js";
import subscriptionRoutes    from "./routes/subscriptionRoutes.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => res.send("MediNexus API Running..."));

app.use("/api/auth",          authRoutes);
app.use("/api/departments",   departmentRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/doctors",       doctorRoutes);
app.use("/api/patients",      patientRoutes);
app.use("/api/appointments",  appointmentRoutes);
app.use("/api/medicines",     medicineRoutes);
app.use("/api/billing",       billingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/patient-portal",   patientPortalRoutes);
app.use("/api/doctor-portal",    doctorPortalRoutes);
app.use("/api/receptionist",     receptionistRoutes);
app.use("/api/payments",         paymentRoutes);
app.use("/api/plans",            planRoutes);
app.use("/api/subscriptions",    subscriptionRoutes);

export default app;