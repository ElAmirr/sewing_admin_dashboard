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
     * Helper to determine the "Business Date" for a log based on Shift 1 (Night Shift).
     * Shift 1 runs from 22:00 to 06:00. Work started between 22:00 and 23:59 belongs to NEXT DAY.
     * @param {string|Date} dateInput 
     * @returns {string} YYYY-MM-DD
     */
    getBusinessDate(dateInput) {
        if (!dateInput) return "Unspecified";
        const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
        if (!isValid(date)) return "Unspecified";

        // Tunisia Time is +01:00. 
        // Logic: 22:00 rollover to next day.
        // Get hour in Tunisia time (UTC+1)
        const tunisiaHour = new Date(date.getTime() + 1 * 60 * 60 * 1000).getUTCHours();

        const shifted = new Date(date.getTime() + 1 * 60 * 60 * 1000);
        if (tunisiaHour >= 22) {
            shifted.setUTCDate(shifted.getUTCDate() + 1);
        }
        return format(shifted, "yyyy-MM-dd", { timeZone: 'UTC' });
        // Note: format from date-fns might still use local time if not careful.
        // Better:
        const d = shifted.getUTCDate();
        const m = shifted.getUTCMonth() + 1;
        const y = shifted.getUTCFullYear();
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    /**
     * Get logs intelligently filtering by date and machine directory structure.
     */
    async getLogs(startDate, endDate) {
        const machines = await metadataRepository.getMachines();
        let daysToRead = [];

        if (startDate && endDate) {
            try {
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                if (isValid(start) && isValid(end)) {
                    daysToRead = eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));
                }
            } catch (e) {
                console.error("Invalid date range:", e);
                return [];
            }
        }

        if (daysToRead.length === 0) return [];

        const promises = machines.map(async (machine) => {
            const machineDir = path.join(DATA_DIR, `machine_${machine.machine_id}`);
            const filePromises = daysToRead.map(async (dateStr) => {
                const filePath = path.join(machineDir, `${dateStr}.json`);
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
        return results.flat();
    }

    /**
     * Get sessions from decentralized machine_id/sessions/{date}.json files
     */
    async getSessions(startDate, endDate) {
        const machines = await metadataRepository.getMachines();
        let daysToRead = [];

        if (startDate && endDate) {
            try {
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                if (isValid(start) && isValid(end)) {
                    daysToRead = eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));
                }
            } catch (e) {
                return [];
            }
        }

        if (daysToRead.length === 0) return [];

        const promises = machines.map(async (machine) => {
            const sessionDir = path.join(DATA_DIR, `machine_${machine.machine_id}`, 'sessions');
            const filePromises = daysToRead.map(async (dateStr) => {
                const filePath = path.join(sessionDir, `${dateStr}.json`);
                try {
                    const content = await fs.readFile(filePath, "utf-8");
                    return JSON.parse(content);
                } catch {
                    return [];
                }
            });

            const sessionGroups = await Promise.all(filePromises);
            return sessionGroups.flat();
        });

        const results = await Promise.all(promises);
        return results.flat();
    }

    async createLog(logData) {
        const { machine_id, cycle_start_time } = logData;
        if (!machine_id || !cycle_start_time) throw new Error("Missing required fields");

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

        const nextLogId = logs.length > 0 ? Math.max(...logs.map(l => l.log_id)) + 1 : Date.now();

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
        const filePath = path.join(DATA_DIR, `machine_${machine_id}`, `${dateStr}.json`);

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
            return false;
        }
        return false;
    }

    async updateLog(log_id, machine_id, cycle_start_time, updatedData) {
        if (!log_id || !machine_id || !cycle_start_time) throw new Error("Missing required fields");
        const dateStr = this.getBusinessDate(cycle_start_time);
        const filePath = path.join(DATA_DIR, `machine_${machine_id}`, `${dateStr}.json`);

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
            return false;
        }
        return false;
    }
}

export const logRepository = new LogRepository();
