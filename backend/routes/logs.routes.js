import express from "express";
import { getLogs, createLog, getSessions } from "../controllers/logs.controller.js";

const router = express.Router();

router.get("/", getLogs);
router.post("/", createLog);
router.get("/sessions", getSessions);

export default router;
