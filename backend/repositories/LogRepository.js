import fs from "fs/promises";
import path from "path";
import { format, eachDayOfInterval, parseISO, isValid } from "date-fns";
import { metadataRepository } from "./MetadataRepository.js";

import { DATA_DIR } from "../config/config.js";

class LogRepository {
    /**
     * Get logs intelligently filtering by date to avoid reading all files.
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     */
    /**
     * Helper to determine the "Business Date" for a log.
     * Anything starting at or after 21:00 belongs to the next calendar day.
     * @param {string|Date} dateInput 
     * @returns {string} YYYY-MM-DD
     */
    getBusinessDate(dateInput) {
        if (!dateInput) return "Unspecified";
        const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
        if (!isValid(date)) return "Unspecified";

        // Shift 3 hours forward: 21:00 -> 00:00 (next day)
        const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
        return format(shifted, "yyyy-MM-dd");
    }

    /**
     * Get logs intelligently filtering by date to avoid reading all files.
     * @param {string} startDate - YYYY-MM-DD (Business Date)
     * @param {string} endDate - YYYY-MM-DD (Business Date)
     */
    async getLogs(startDate, endDate) {
        const machines = await metadataRepository.getMachines();
        let filesToRead = [];

        // 1. Calculate which date-files we need to look for
        if (startDate && endDate) {
            try {
                const start = parseISO(startDate);
                const end = parseISO(endDate);

                if (isValid(start) && isValid(end)) {
                    // We look back one extra day to catch any existing data split by literal date
                    const lookBackStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
                    const days = eachDayOfInterval({ start: lookBackStart, end });
                    filesToRead = days.map(d => `${format(d, "yyyy-MM-dd")}.json`);
                }
            } catch (e) {
                console.error("Invalid date range:", e);
                return [];
            }
        }

        if (filesToRead.length === 0) return [];

        let allLogs = [];

        // 2. Scan relevant files
        const promises = machines.map(async (machine) => {
            const machineDir = path.join(DATA_DIR, `machine_${machine.machine_id}`);
            const filePromises = filesToRead.map(async (filename) => {
                const filePath = path.join(machineDir, filename);
                try {
                    const content = await fs.readFile(filePath, "utf-8");
                    return JSON.parse(content);
                } catch {
                    return [];
                }
            });

            const machineLogsGroups = await Promise.all(filePromises);
            return machineLogsGroups.flat();
        });

        const results = await Promise.all(promises);
        results.forEach(logs => allLogs.push(...logs));

        // 3. Filter and group by Business Date
        // This ensures that even if logs were split across files, they are grouped correctly now
        return allLogs.filter(log => {
            const bDate = this.getBusinessDate(log.cycle_start_time);
            return bDate >= startDate && bDate <= endDate;
        });
    }

    async createLog(logData) {
        const { machine_id, cycle_start_time } = logData;
        if (!machine_id || !cycle_start_time) throw new Error("Missing required fields");

        // Save based on Business Date
        const dateStr = this.getBusinessDate(cycle_start_time);
        const machineDir = path.join(DATA_DIR, `machine_${machine_id}`);
        const filePath = path.join(machineDir, `${dateStr}.json`);

        await fs.mkdir(machineDir, { recursive: true });

        let logs = [];
        try {
            const content = await fs.readFile(filePath, "utf-8");
            logs = JSON.parse(content);
        } catch {
            logs = [];
        }

        // --- Duplicate Prevention Logic ---
        // Check if a log for this machine and cycle already exists
        const existingLog = logs.find(l =>
            String(l.machine_id) === String(machine_id) &&
            l.cycle_start_time === cycle_start_time
        );

        if (existingLog) {
            console.log(`⚠️ Duplicate log detected for machine ${machine_id} at ${cycle_start_time}. Ignoring.`);
            return existingLog.log_id; // Return existing ID to satisfy the caller idempotently
        }
        // ----------------------------------

        const nextLogId = logs.length > 0 ? Math.max(...logs.map(l => l.log_id)) + 1 : 1;

        // Auto-inject supervisor badge if ID is provided
        let supervisor_badge = logData.supervisor_badge;
        if (logData.supervisor_id && !supervisor_badge) {
            const supervisors = await metadataRepository.getSupervisors();
            const sup = supervisors.find(s => s.supervisor_id === logData.supervisor_id);
            if (sup) supervisor_badge = sup.badge;
        }

        const newLog = {
            ...logData,
            log_id: nextLogId,
            supervisor_badge: supervisor_badge || null,
            updated_at: new Date().toISOString()
        };

        logs.push(newLog);
        await fs.writeFile(filePath, JSON.stringify(logs, null, 2));

        return nextLogId;
    }

    async deleteLog(log_id, machine_id, cycle_start_time) {
        if (!log_id || !machine_id || !cycle_start_time) throw new Error("Missing required fields");

        const dateStr = this.getBusinessDate(cycle_start_time);
        const literalDate = format(parseISO(cycle_start_time), "yyyy-MM-dd");

        const filesToCheck = [...new Set([dateStr, literalDate])];

        for (const filename of filesToCheck) {
            const filePath = path.join(DATA_DIR, `machine_${machine_id}`, `${filename}.json`);
            try {
                const content = await fs.readFile(filePath, "utf-8");
                let logs = JSON.parse(content);
                const originalLength = logs.length;
                const filtered = logs.filter(l => String(l.log_id) !== String(log_id));

                if (filtered.length !== originalLength) {
                    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
                    return true;
                }
            } catch (e) {
                // Ignore missing files and check next
                continue;
            }
        }
        return false;
    }

    async updateLog(log_id, machine_id, cycle_start_time, updatedData) {
        if (!log_id || !machine_id || !cycle_start_time) throw new Error("Missing required fields");

        const dateStr = this.getBusinessDate(cycle_start_time);
        const literalDate = format(parseISO(cycle_start_time), "yyyy-MM-dd");

        const filesToCheck = [...new Set([dateStr, literalDate])];

        for (const filename of filesToCheck) {
            const filePath = path.join(DATA_DIR, `machine_${machine_id}`, `${filename}.json`);
            try {
                const content = await fs.readFile(filePath, "utf-8");
                let logs = JSON.parse(content);
                const index = logs.findIndex(l => String(l.log_id) === String(log_id));

                if (index !== -1) {
                    let updatedWithBadge = { ...updatedData };

                    if (updatedData.supervisor_id && !updatedData.supervisor_badge) {
                        const supervisors = await metadataRepository.getSupervisors();
                        const sup = supervisors.find(s => s.supervisor_id === updatedData.supervisor_id);
                        if (sup) updatedWithBadge.supervisor_badge = sup.badge;
                    }

                    logs[index] = { ...logs[index], ...updatedWithBadge, updated_at: new Date().toISOString() };
                    await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
                    return true;
                }
            } catch (e) {
                // Ignore missing files and check next
                continue;
            }
        }
        return false;
    }
}

export const logRepository = new LogRepository();
