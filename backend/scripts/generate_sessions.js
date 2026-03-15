import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { DATA_DIR } from "../config/config.js";
const OUTPUT_FILE = path.join(DATA_DIR, "machine_sessions.json");

const getBusinessDate = (d) => {
    const date = new Date(d);
    // Get hour in Tunisia time (UTC+1)
    const tunisiaHour = new Date(date.getTime() + 1 * 60 * 60 * 1000).getUTCHours();
    const shifted = new Date(date.getTime() + 1 * 60 * 60 * 1000);
    if (tunisiaHour >= 22) {
        shifted.setUTCDate(shifted.getUTCDate() + 1);
    }
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const year = shifted.getUTCFullYear();
    return `${year}-${month}-${day}`;
};

const getShift = (d) => {
    const hour = new Date(d).getHours();
    if (hour >= 22 || hour < 6) return "Shift1";
    if (hour >= 6 && hour < 14) return "Shift2";
    return "Shift3";
};

async function generateSessions() {
    console.log("🚀 Starting Decentralized Session Generation...");

    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const machineDirs = entries.filter(e => e.isDirectory() && e.name.startsWith("machine_"));

        const operatorsPath = path.join(DATA_DIR, "operators.json");
        let operatorsMap = {};
        try {
            const ops = JSON.parse(await fs.readFile(operatorsPath, "utf-8"));
            ops.forEach(op => operatorsMap[op.operator_id] = op.badge);
        } catch (e) { }

        // Output collection: machine_id -> business_date -> [sessions]
        const outputs = {};

        for (const dir of machineDirs) {
            const machineIdStr = dir.name.split("_")[1];
            const machineId = parseInt(machineIdStr);
            const dirPath = path.join(DATA_DIR, dir.name);
            const files = await fs.readdir(dirPath);

            const machineGroups = {}; // sessionKey -> sessionObj

            for (const file of files) {
                if (!file.endsWith(".json") || file === "sessions") continue;
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) continue;

                const content = await fs.readFile(filePath, "utf-8");
                let logs = [];
                try { logs = JSON.parse(content); } catch (e) { continue; }

                logs.forEach(log => {
                    if (!log.operator_id) return;
                    const bizDate = getBusinessDate(log.cycle_start_time);
                    const shift = getShift(log.cycle_start_time);
                    const key = `${log.operator_id}_${shift}_${bizDate}`;

                    if (!machineGroups[key]) {
                        machineGroups[key] = {
                            machine_id: machineId,
                            operator_id: parseInt(log.operator_id),
                            shift: shift,
                            started_at: log.cycle_start_time,
                            ended_at: log.cycle_end_time || null,
                            business_date: bizDate,
                            badge: operatorsMap[log.operator_id] || "UNKNOWN"
                        };
                    } else {
                        if (new Date(log.cycle_start_time) < new Date(machineGroups[key].started_at)) {
                            machineGroups[key].started_at = log.cycle_start_time;
                        }
                        if (log.cycle_end_time && (!machineGroups[key].ended_at || new Date(log.cycle_end_time) > new Date(machineGroups[key].ended_at))) {
                            machineGroups[key].ended_at = log.cycle_end_time;
                        }
                    }
                });
            }

            // Organize by date for this machine
            for (const session of Object.values(machineGroups)) {
                const bDate = session.business_date;
                const mKey = machineId;
                if (!outputs[mKey]) outputs[mKey] = {};
                if (!outputs[mKey][bDate]) outputs[mKey][bDate] = [];

                session.session_id = `${mKey}_${session.operator_id}_${Date.parse(session.started_at)}`;
                session.last_heartbeat = session.ended_at;
                outputs[mKey][bDate].push(session);
            }
        }

        // Write decentralized files
        let totalFiles = 0;
        for (const [mId, dates] of Object.entries(outputs)) {
            const sessionDir = path.join(DATA_DIR, `machine_${mId}`, "sessions");
            await fs.mkdir(sessionDir, { recursive: true });

            for (const [date, sessions] of Object.entries(dates)) {
                const filePath = path.join(sessionDir, `${date}.json`);
                await fs.writeFile(filePath, JSON.stringify(sessions, null, 2));
                totalFiles++;
            }
        }

        console.log(`🎉 Generated session files for ${Object.keys(outputs).length} machines across ${totalFiles} total files.`);

    } catch (error) {
        console.error("❌ Generation Failed:", error);
    }
}

generateSessions();
