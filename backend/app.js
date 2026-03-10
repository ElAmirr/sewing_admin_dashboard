import express from "express";
import cors from "cors";
import logsRoutes from "./routes/logs.routes.js";
import * as metadataController from "./controllers/metadata.controller.js";
import * as authController from "./controllers/auth.controller.js";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV === "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

console.log("--- Backend Initializing ---");
console.log("Env NODE_ENV:", process.env.NODE_ENV);
console.log("Env DATA_PATH:", process.env.DATA_PATH);
console.log("__dirname:", __dirname);

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Auth Routes
app.post("/api/auth/login", authController.login);
app.get("/api/auth/users", authController.getUsers);
app.post("/api/auth/users", authController.addUser);
app.delete("/api/auth/users/:id", authController.deleteUser);

// Migrate any plain-text passwords to bcrypt hashes on startup
authController.migratePasswords();

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
// In packaged app, we might be running from app.asar.unpacked/backend
// but frontend is in app.asar/frontend/dist
const frontendDistPath = isDev
  ? path.join(__dirname, "../frontend/dist")
  : path.join(__dirname, "../frontend/dist").replace('app.asar.unpacked', 'app.asar');

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
