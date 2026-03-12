import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');

async function deduplicate() {
    console.log(`🚀 Starting deduplication in ${DATA_DIR}...`);

    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const machineDirs = entries
        .filter(e => e.isDirectory() && e.name.startsWith('machine_'))
        .map(e => e.name);

    let totalRemoved = 0;

    for (const machineDir of machineDirs) {
        const machinePath = path.join(DATA_DIR, machineDir);
        const files = (await fs.readdir(machinePath)).filter(f => f.endsWith('.json'));

        // Track seen records across all days for this machine
        // Key: operator_press_time + status + color + operator_id
        const seen = new Set();

        for (const file of files) {
            const filePath = path.join(machinePath, file);
            let logs = [];
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                logs = JSON.parse(content);
            } catch (e) {
                console.error(`Error reading ${filePath}: ${e.message}`);
                continue;
            }

            const originalCount = logs.length;
            const uniqueLogs = [];
            const seenKeys = new Set();

            for (const log of logs) {
                // Key: machine_id + cycle_start_time (Deduplicate per cycle)
                const key = `${log.machine_id}_${log.cycle_start_time}`;

                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueLogs.push(log);
                }
            }

            if (uniqueLogs.length < originalCount) {
                const removed = originalCount - uniqueLogs.length;
                totalRemoved += removed;
                console.log(`✅ Removed ${removed} duplicates from ${machineDir}/${file}`);
                await fs.writeFile(filePath, JSON.stringify(uniqueLogs, null, 2));
            }
        }
    }

    console.log(`🎉 Deduplication complete. Total records removed: ${totalRemoved}`);
}

deduplicate().catch(console.error);
