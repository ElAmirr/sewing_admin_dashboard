const fs = require('fs');
const path = require('path');

const { getRootDataDir } = require('./utils/config');

const DATA_DIR = getRootDataDir();
const SESSION_FILE = path.join(DATA_DIR, 'machine_sessions.json');

function getBusinessDate(dateInput) {
    if (!dateInput) return "Unspecified";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Unspecified";

    // Shift 3 hours forward: 21:00 -> 00:00 (next day)
    const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);

    // Format as YYYY-MM-DD
    const y = shifted.getFullYear();
    const m = String(shifted.getMonth() + 1).padStart(2, '0');
    const d = String(shifted.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function analyze() {
    if (!fs.existsSync(SESSION_FILE)) {
        console.error('Session file not found');
        return;
    }

    const sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const machines = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('machine_') && !fs.statSync(path.join(DATA_DIR, f)).isFile());

    const missingSessions = [];
    const seenSessions = new Set();

    // Index existing sessions
    sessions.forEach(s => {
        const bDate = s.business_date || getBusinessDate(s.started_at);
        seenSessions.add(`${s.operator_id}_${s.machine_id}_${bDate}`);
    });

    for (const machineDir of machines) {
        const machineId = parseInt(machineDir.split('_')[1]);
        const machinePath = path.join(DATA_DIR, machineDir);
        const logFiles = fs.readdirSync(machinePath).filter(f => f.endsWith('.json'));

        for (const logFile of logFiles) {
            const logs = JSON.parse(fs.readFileSync(path.join(machinePath, logFile), 'utf8'));

            for (const log of logs) {
                if (!log.operator_id) continue;

                const bizDate = log.business_date || getBusinessDate(log.cycle_start_time);
                const key = `${log.operator_id}_${machineId}_${bizDate}`;

                if (!seenSessions.has(key)) {
                    missingSessions.push({
                        operator_id: log.operator_id,
                        machine_id: machineId,
                        business_date: bizDate,
                        started_at: log.operator_press_time || log.cycle_start_time,
                        ended_at: log.operator_press_time || log.cycle_end_time
                    });
                    seenSessions.add(key);
                }
            }
        }
    }

    console.log(JSON.stringify(missingSessions, null, 2));
}

analyze();
