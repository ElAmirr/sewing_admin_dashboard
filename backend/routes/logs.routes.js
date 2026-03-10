import express from "express";
import { getLogs, createLog, getSessions, updateLog, deleteLog, getActiveSessions, forceLogout } from "../controllers/logs.controller.js";

const router = express.Router();

router.get("/", getLogs);
router.post("/", createLog);
router.get("/sessions", getSessions);
router.get("/sessions/active", getActiveSessions);
router.post("/sessions/:id/logout", forceLogout);
router.put("/:id", updateLog);
router.delete("/:id", deleteLog);

export default router;
