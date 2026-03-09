import express from "express";
import { getLogs, createLog, getSessions, updateLog, deleteLog } from "../controllers/logs.controller.js";

const router = express.Router();

router.get("/", getLogs);
router.post("/", createLog);
router.get("/sessions", getSessions);
router.put("/:id", updateLog);
router.delete("/:id", deleteLog);

export default router;
