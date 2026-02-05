import { logRepository } from "../repositories/LogRepository.js";
import { metadataRepository } from "../repositories/MetadataRepository.js";
import { format, subDays } from "date-fns";
import fs from "fs/promises";
import path from "path";

/* ---------------- GET LOGS ---------------- */

export const getLogs = async (req, res) => {
  try {
    // Default to last 7 days if no date provided to prevent reading too many files
    const today = new Date();
    const defaultStart = format(subDays(today, 7), "yyyy-MM-dd");
    const defaultEnd = format(today, "yyyy-MM-dd");

    const { startDate = defaultStart, endDate = defaultEnd } = req.query;

    // Parallel data fetching
    const [rawLogs, operators, supervisors] = await Promise.all([
      logRepository.getLogs(startDate, endDate),
      metadataRepository.getOperators(),
      metadataRepository.getSupervisors()
    ]);

    const transformed = rawLogs
      .map((log) => {
        const operator = operators.find(
          (o) => o.operator_id === log.operator_id
        );

        const supervisor = supervisors.find(
          (s) => s.supervisor_id === log.supervisor_id
        );

        return {
          log_id: log.log_id,
          machine: log.machine_id,
          operator: operator
            ? { name: operator.name, badge: operator.badge }
            : null,
          supervisor: supervisor
            ? {
              name: supervisor.supervisor_name,
              badge: supervisor.badge,
            }
            : null,
          color: log.color,
          status: log.status,
          operator_press_time: log.operator_press_time,
          supervisor_confirmation: log.supervisor_confirmation,
          supervisor_scan_time: log.supervisor_scan_time,
          cycle_start_time: log.cycle_start_time,
          cycle_end_time: log.cycle_end_time,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.cycle_start_time) - new Date(a.cycle_start_time) ||
          new Date(b.operator_press_time) - new Date(a.operator_press_time)
      );

    res.status(200).json(transformed);
  } catch (error) {
    console.error("❌ getLogs error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

/* ---------------- CREATE LOG ---------------- */

export const createLog = async (req, res) => {
  try {
    const {
      machine,
      operator,
      supervisor,
      color,
      status,
      operator_press_time,
      cycle_start_time,
      cycle_end_time,
    } = req.body;

    // Basic validation
    if (!machine || !cycle_start_time || !cycle_end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const logData = {
      machine_id: machine,
      operator_id: operator ?? null,
      supervisor_id: supervisor ?? null,
      color,
      status,
      operator_press_time,
      cycle_start_time,
      cycle_end_time
    };

    const newLogId = await logRepository.createLog(logData);

    res.status(201).json({ id: newLogId });
  } catch (error) {
    console.error("❌ createLog error:", error);
    res.status(500).json({ error: "Failed to create log" });
  }
};

/* ---------------- GET SESSIONS ---------------- */

export const getSessions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const DATA_DIR = path.resolve("data");
    const SESSION_FILE = path.join(DATA_DIR, "machine_sessions.json");

    let sessions = [];
    try {
      const content = await fs.readFile(SESSION_FILE, "utf-8");
      sessions = JSON.parse(content);
    } catch (e) {
      return res.status(200).json([]);
    }

    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const endTime = end.getTime();

      sessions = sessions.filter(s => {
        const sessionStart = new Date(s.started_at).getTime();
        return sessionStart >= start && sessionStart <= endTime;
      });
    }

    res.status(200).json(sessions);

  } catch (error) {
    console.error("❌ getSessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};
