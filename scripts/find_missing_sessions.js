const fs = require('fs');
const path = require('path');

const DATA_DIR = './data';
const SESSION_FILE = path.join(DATA_DIR, 'machine_sessions.json');
const DATE_TO_CHECK = '2026-03-05';

async function analyze() {
    const sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const missingSessions = [];
    const machines = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('machine_') && !f.endsWith('.json'));

    for (const machineDir of machines) {
        const machineId = parseInt(machineDir.split('_')[1]);
        const logFile = path.join(DATA_DIR, machineDir, `${DATE_TO_CHECK}.json`);

        if (!fs.existsSync(logFile)) continue;

        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));

        for (const log of logs) {
            if (!log.operator_id) continue;

            // Check if this operator has a session on this machine for this business date
            const hasSession = sessions.some(s => {
                if (s.operator_id !== log.operator_id || s.machine_id !== machineId) return false;

                // Calculate business date for session start
                const date = new Date(s.started_at);
                const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
                const bDate = shifted.getFullYear() + "-" +
                    String(shifted.getMonth() + 1).padStart(2, '0') + "-" +
                    String(shifted.getDate()).padStart(2, '0');

                return bDate === DATE_TO_CHECK;
            });

            if (!hasSession) {
                missingSessions.push({
                    operator_id: log.operator_id,
                    machine_id: machineId,
                    date: DATE_TO_CHECK,
                    first_seen: log.operator_press_time || log.cycle_start_time,
                    last_seen: log.operator_press_time || log.cycle_end_time
                });
            }
        }
    }

    // Deduplicate missing sessions by operator + machine
    const uniqueMissing = [];
    const seen = new Set();
    for (const m of missingSessions) {
        const key = `${m.operator_id}_${m.machine_id}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMissing.push(m);
        }
    }

    console.log(JSON.stringify(uniqueMissing, null, 2));
}

analyze();
