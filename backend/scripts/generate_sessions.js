import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");
const OUTPUT_FILE = path.join(DATA_DIR, "machine_sessions.json");

async function generateSessions() {
    console.log("🚀 Starting Session Generation...");

    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const machineDirs = entries.filter(e => e.isDirectory() && e.name.startsWith("machine_"));

        let allSessions = [];
        let sessionIdCounter = 1;

        // Load operators to get badges
        const operatorsPath = path.join(DATA_DIR, "operators.json");
        let operatorsMap = {};
        try {
            const ops = JSON.parse(await fs.readFile(operatorsPath, "utf-8"));
            ops.forEach(op => operatorsMap[op.operator_id] = op.badge);
        } catch (e) {
            console.warn("⚠️ Could not load operators.json, badges might be missing.");
        }

        for (const dir of machineDirs) {
            const machineId = parseInt(dir.name.split("_")[1]);
            const dirPath = path.join(DATA_DIR, dir.name);
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                if (!file.endsWith(".json")) continue;

                const filePath = path.join(dirPath, file);
                const content = await fs.readFile(filePath, "utf-8");
                let logs = [];

                try {
                    logs = JSON.parse(content);
                } catch (e) {
                    continue;
                }

                if (!logs.length) continue;

                // Group by Operator
                const operatorGroups = {}; // ID -> { minStart, maxEnd }

                logs.forEach(log => {
                    const opId = log.operator_id;
                    if (!opId) return;

                    if (!operatorGroups[opId]) {
                        operatorGroups[opId] = {
                            start: log.cycle_start_time,
                            end: log.cycle_end_time
                        };
                    } else {
                        // Update min start
                        if (log.cycle_start_time && new Date(log.cycle_start_time) < new Date(operatorGroups[opId].start)) {
                            operatorGroups[opId].start = log.cycle_start_time;
                        }
                        // Update max end
                        if (log.cycle_end_time && new Date(log.cycle_end_time) > new Date(operatorGroups[opId].end)) {
                            operatorGroups[opId].end = log.cycle_end_time;
                        }
                    }
                });

                // Create Sessions
                Object.entries(operatorGroups).forEach(([opIdStr, times]) => {
                    const opId = parseInt(opIdStr);
                    allSessions.push({
                        session_id: sessionIdCounter++,
                        machine_id: machineId,
                        operator_id: opId,
                        badge: operatorsMap[opId] || "UNKNOWN",
                        shift: "Shift1", // Placeholder, could infer from time
                        started_at: times.start,
                        last_heartbeat: times.end, // Assuming active until last cycle
                        ended_at: times.end
                    });
                });
            }
        }

        // Sort by date desc
        allSessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

        await fs.writeFile(OUTPUT_FILE, JSON.stringify(allSessions, null, 2));
        console.log(`🎉 Generated ${allSessions.length} sessions in machine_sessions.json`);

    } catch (error) {
        console.error("❌ Generation Failed:", error);
    }
}

generateSessions();
