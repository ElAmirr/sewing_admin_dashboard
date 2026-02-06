import app from "./app.js";
import * as logsController from "./controllers/logs.controller.js";
import * as metadataController from "./controllers/metadata.controller.js";
import cors from "cors";
import bodyParser from "body-parser";

const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Logs
app.get("/api/logs", logsController.getLogs);
app.post("/api/logs", logsController.createLog);
app.get("/api/sessions", logsController.getSessions);

// Metadata
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
