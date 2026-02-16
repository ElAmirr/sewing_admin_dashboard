import express from "express";
import cors from "cors";
import logsRoutes from "./routes/logs.routes.js";
import * as metadataController from "./controllers/metadata.controller.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Routes
app.use("/api/logs", logsRoutes);

// Metadata Routes
app.get("/api/metadata/operators", metadataController.getOperators);
app.post("/api/metadata/operators", metadataController.addOperator);
app.put("/api/metadata/operators/:id", metadataController.updateOperator);
app.delete("/api/metadata/operators/:id", metadataController.deleteOperator);

app.get("/api/metadata/supervisors", metadataController.getSupervisors);
app.post("/api/metadata/supervisors", metadataController.addSupervisor);
app.put("/api/metadata/supervisors/:id", metadataController.updateSupervisor);
app.delete("/api/metadata/supervisors/:id", metadataController.deleteSupervisor);

app.get("/api/metadata/machines", metadataController.getMachines);
app.post("/api/metadata/machines", metadataController.addMachine);
app.put("/api/metadata/machines/:id", metadataController.updateMachine);
app.delete("/api/metadata/machines/:id", metadataController.deleteMachine);

// Serve static files from the frontend/dist directory
const frontendDistPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDistPath));

// Catch-all route to serve the frontend's index.html for any non-API requests
app.get("*", (req, res, next) => {
  if (req.url.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
