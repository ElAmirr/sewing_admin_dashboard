import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { DATA_DIR } from "../config/config.js";
const OUTPUT_FILE = path.join(DATA_DIR, "machine_sessions.json");

const getBusinessDate = (d) => {
    const date = new Date(d);
    const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    return shifted.toISOString().split("T")[0];
};

const getShift = (d) => {
    const hour = new Date(d).getUTCHours();
    if (hour >= 21 || hour < 5) return "Shift1";
    if (hour >= 5 && hour < 13) return "Shift2";
    return "Shift3";
};

async function generateSessions() {
    console.log("🚀 Starting Refined Session Generation...");

    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const machineDirs = entries.filter(e => e.isDirectory() && e.name.startsWith("machine_"));

        const operatorsPath = path.join(DATA_DIR, "operators.json");
        let operatorsMap = {};
        try {
            const ops = JSON.parse(await fs.readFile(operatorsPath, "utf-8"));
            ops.forEach(op => operatorsMap[op.operator_id] = op.badge);
        } catch (e) { }

        const globalGroups = {}; // opId_bizDate -> { machine_id, shift, start, end }

        for (const dir of machineDirs) {
            const machineId = parseInt(dir.name.split("_")[1]);
            const dirPath = path.join(DATA_DIR, dir.name);
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                if (!file.endsWith(".json")) continue;
                const filePath = path.join(dirPath, file);
                const content = await fs.readFile(filePath, "utf-8");
                let logs = [];
                try { logs = JSON.parse(content); } catch (e) { continue; }

                logs.forEach(log => {
                    if (!log.operator_id) return;
                    const bizDate = getBusinessDate(log.cycle_start_time);
                    const shift = getShift(log.cycle_start_time);
                    const key = `${log.operator_id}_${bizDate}`;

                    if (!globalGroups[key]) {
                        globalGroups[key] = {
                            machine_id: machineId,
                            operator_id: parseInt(log.operator_id),
                            shift: shift,
                            started_at: log.cycle_start_time,
                            ended_at: log.cycle_end_time || null
                        };
                    } else {
                        // Merge logic
                        if (new Date(log.cycle_start_time) < new Date(globalGroups[key].started_at)) {
                            globalGroups[key].started_at = log.cycle_start_time;
                        }
                        if (log.cycle_end_time && (!globalGroups[key].ended_at || new Date(log.cycle_end_time) > new Date(globalGroups[key].ended_at))) {
                            globalGroups[key].ended_at = log.cycle_end_time;
                        } else if (!log.cycle_end_time && !globalGroups[key].ended_at) {
                            // Keep it null or potentially update heartbeat
                        }
                    }
                });
            }
        }

        let sessionIdCounter = 1;
        const allSessions = Object.values(globalGroups).map(g => ({
            session_id: sessionIdCounter++,
            ...g,
            badge: operatorsMap[g.operator_id] || "UNKNOWN",
            last_heartbeat: g.ended_at
        }));

        // Sort by date desc
        allSessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

        await fs.writeFile(OUTPUT_FILE, JSON.stringify(allSessions, null, 2));
        console.log(`🎉 Generated ${allSessions.length} total sessions in machine_sessions.json`);

    } catch (error) {
        console.error("❌ Generation Failed:", error);
    }
}

generateSessions();
