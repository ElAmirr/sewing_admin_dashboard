import fs from "fs/promises";
import path from "path";
import { format, eachDayOfInterval, parseISO, isValid } from "date-fns";
import { metadataRepository } from "./MetadataRepository.js";

const DATA_DIR = process.env.DATA_PATH || path.resolve("data");

class LogRepository {
    /**
     * Get logs intelligently filtering by date to avoid reading all files.
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
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
                    const days = eachDayOfInterval({ start, end });
                    filesToRead = days.map(d => `${format(d, "yyyy-MM-dd")}.json`);
                }
            } catch (e) {
                console.error("Invalid date range, defaulting to scanning recent files?");
                // If date parsing fails, strictly we might want to fail or read nothing
                // For now, let's return empty or handle gracefully.
                return [];
            }
        }

        // If no date range is provided, we might default to today's file in the controller
        // or we can implement a fallback here. For now, we assume controller passes dates.
        if (filesToRead.length === 0) {
            // Fallback: This effectively means "read nothing" if no dates provided?
            // Or should we support "read all" if no dates?
            // The requirement is to optimize. Reading ALL is bad.
            // Let's assume the controller ensures default dates are passed.
            return [];
        }

        let allLogs = [];

        // 2. Scan only relevant files in parallel
        const promises = machines.map(async (machine) => {
            const machineDir = path.join(DATA_DIR, `machine_${machine.machine_id}`);

            // We only try to read the specific files we calculated
            const filePromises = filesToRead.map(async (filename) => {
                const filePath = path.join(machineDir, filename);
                try {
                    const content = await fs.readFile(filePath, "utf-8");
                    return JSON.parse(content);
                } catch (err) {
                    // File doesn't exist for this date, which is normal
                    return [];
                }
            });

            const machineLogsGroups = await Promise.all(filePromises);
            return machineLogsGroups.flat();
        });

        const results = await Promise.all(promises);
        results.forEach(logs => allLogs.push(...logs));

        return allLogs;
    }

    async createLog(logData) {
        const { machine_id, cycle_start_time } = logData;
        if (!machine_id || !cycle_start_time) throw new Error("Missing required fields");

        // Format: YYYY-MM-DD.json
        const dateStr = format(parseISO(cycle_start_time), "yyyy-MM-dd");
        const machineDir = path.join(DATA_DIR, `machine_${machine_id}`);
        const filePath = path.join(machineDir, `${dateStr}.json`);

        // Ensure directory exists
        await fs.mkdir(machineDir, { recursive: true });

        // Read existing or init
        let logs = [];
        try {
            const content = await fs.readFile(filePath, "utf-8");
            logs = JSON.parse(content);
        } catch {
            logs = [];
        }

        // Generate ID (Local atomic increment-ish)
        // Note: This is not race-condition proof against external apps, 
        // but improved vs original. External app write conflict is still a risk with file system.
        const nextLogId = logs.length > 0 ? Math.max(...logs.map(l => l.log_id)) + 1 : 1;

        const newLog = {
            ...logData,
            log_id: nextLogId,
            updated_at: new Date().toISOString()
        };

        logs.push(newLog);

        // Write safely
        await fs.writeFile(filePath, JSON.stringify(logs, null, 2));

        return nextLogId;
    }
}

export const logRepository = new LogRepository();
