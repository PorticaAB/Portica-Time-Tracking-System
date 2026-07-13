import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import contractorRoutes from "./routes/contractors";
import clientRoutes from "./routes/clients";
import projectRoutes from "./routes/projects";
import timeEntryRoutes from "./routes/timeEntries";
import holidayRoutes from "./routes/holidays";
import reportRoutes from "./routes/reports";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  const origins = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length > 0 ? origins : true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/contractors", contractorRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/time-entries", timeEntryRoutes);
  app.use("/api/holidays", holidayRoutes);
  app.use("/api/reports", reportRoutes);

  app.use(errorHandler);

  return app;
}
