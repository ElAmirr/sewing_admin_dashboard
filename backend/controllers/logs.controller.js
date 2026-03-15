import { logRepository } from "../repositories/LogRepository.js";
import { metadataRepository } from "../repositories/MetadataRepository.js";
import { format, subDays } from "date-fns";
import fs from "fs/promises";
import path from "path";
import { DATA_DIR } from "../config/config.js";

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
          machine_id: log.machine_id,
          machine: log.machine_id,
          operator_id: log.operator_id,
          supervisor_id: log.supervisor_id,
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
          business_date: logRepository.getBusinessDate(log.cycle_start_time)
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

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate queries are required" });
    }

    const sessions = await logRepository.getSessions(startDate, endDate);

    const transformedSessions = sessions.map(s => ({
      ...s,
      business_date: logRepository.getBusinessDate(s.started_at)
    }));

    res.status(200).json(transformedSessions);

  } catch (error) {
    console.error("❌ getSessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

/* ---------------- GET ACTIVE SESSIONS ---------------- */

export const getActiveSessions = async (req, res) => {
  try {
    // For active sessions, we look at the last 2 days of sessions to be safe
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    const sessions = await logRepository.getSessions(yesterday, today);

    const activeSessions = sessions.filter(s => {
      // Logic for "active" in decentralized system:
      // ended_at is null
      return !s.ended_at;
    });

    res.status(200).json(activeSessions);
  } catch (error) {
    console.error("❌ getActiveSessions error:", error);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
};

/* ---------------- FORCE LOGOUT ---------------- */

export const forceLogout = async (req, res) => {
  try {
    const { id } = req.params; // session_id
    const { machine_id, started_at } = req.body; // We need context to find the file

    if (!machine_id || !started_at) {
      return res.status(400).json({ error: "Missing required session context (machine_id, started_at)" });
    }

    const dateStr = logRepository.getBusinessDate(started_at);
    const sessionDir = path.join(DATA_DIR, `machine_${machine_id}`, 'sessions');
    const filePath = path.join(sessionDir, `${dateStr}.json`);

    let sessions = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      sessions = JSON.parse(content);
    } catch (e) {
      return res.status(404).json({ error: "Session file not found" });
    }

    const sessionIndex = sessions.findIndex(s => String(s.session_id) === String(id));
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Session not found" });
    }

    const now = new Date().toISOString().replace('Z', '+01:00');

    // 1. Update session in file
    sessions[sessionIndex].ended_at = now;
    sessions[sessionIndex].last_heartbeat = now;
    await fs.writeFile(filePath, JSON.stringify(sessions, null, 2));

    // 2. Create a "Force Logout" log entry in the machine's log file
    const logData = {
      machine_id: machine_id,
      operator_id: sessions[sessionIndex].operator_id,
      color: "NONE",
      status: "FORCE_LOGOUT",
      operator_press_time: now,
      cycle_start_time: now,
      cycle_end_time: now,
      updated_at: now
    };

    await logRepository.createLog(logData);

    res.status(200).json({ message: "Force logout successful", ended_at: now });
  } catch (error) {
    console.error("❌ forceLogout error:", error);
    res.status(500).json({ error: "Failed to force logout" });
  }
};

/* ---------------- UPDATE LOG ---------------- */

export const updateLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { machine, cycle_start_time, ...updatedData } = req.body;

    if (!machine || !cycle_start_time) {
      return res.status(400).json({ error: "Missing identifying fields (machine, cycle_start_time)" });
    }

    // Map machine to machine_id if that's how it's stored in filenames but data is machine
    // Based on LogRepository.js, it expects machine_id
    const success = await logRepository.updateLog(id, machine, cycle_start_time, updatedData);

    if (success) {
      res.status(200).json({ message: "Log updated successfully" });
    } else {
      res.status(404).json({ error: "Log not found" });
    }
  } catch (error) {
    console.error("❌ updateLog error:", error);
    res.status(500).json({ error: "Failed to update log" });
  }
};

/* ---------------- DELETE LOG ---------------- */

export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { machine, cycle_start_time } = req.query; // Context passed via query params for DELETE

    if (!machine || !cycle_start_time) {
      return res.status(400).json({ error: "Missing identifying fields (machine, cycle_start_time)" });
    }

    const success = await logRepository.deleteLog(id, machine, cycle_start_time);

    if (success) {
      res.status(200).json({ message: "Log deleted successfully" });
    } else {
      res.status(404).json({ error: "Log not found" });
    }
  } catch (error) {
    console.error("❌ deleteLog error:", error);
    res.status(500).json({ error: "Failed to delete log" });
  }
};
