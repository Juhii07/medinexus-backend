import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "../app.js";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("MongoDB Connected");
}

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}