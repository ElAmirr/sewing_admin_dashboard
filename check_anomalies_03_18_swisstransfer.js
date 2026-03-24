const fs = require('fs');
const path = require('path');

const dataDir = '/home/user/Téléchargements/swisstransfer_4d53fe01-c181-4da5-866b-e8c186cecd32/data';
const targetDate = '2026-03-18';
const machines = fs.readdirSync(dataDir).filter(f => f.startsWith('machine_'));

function getShift(dateStr) {
    const h = new Date(dateStr).getHours();
    if (h >= 22 || h < 6) return "shift1";
    if (h >= 6 && h < 14) return "shift2";
    if (h >= 14 && h < 22) return "shift3";
    return "unknown";
}

function countOverlapWindows(startStr, endStr) {
    if (!startStr) return 0;
    const s = new Date(startStr);
    const e = endStr ? new Date(endStr) : new Date();
    if (e <= s) return 0;
    let count = 0;
    let current = new Date(s);
    current.setMinutes(0, 0, 0);
    if (current.getHours() % 2 !== 0) {
        current.setHours(current.getHours() - 1);
    }
    while (current < e) {
        const wS = current.getTime();
        const wE = wS + 2 * 60 * 60 * 1000;
        if (Math.max(wS, s.getTime()) < Math.min(wE, e.getTime())) {
            count++;
        }
        current = new Date(wE);
    }
    return count;
}

machines.forEach(mDir => {
    const mPath = path.join(dataDir, mDir);
    const filePath = path.join(mPath, `${targetDate}.json`);
    
    if (fs.existsSync(filePath)) {
        const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const sessionPath = path.join(mPath, 'sessions', `${targetDate}.json`);
        
        let sessions = [];
        if (fs.existsSync(sessionPath)) {
            sessions = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        }
        
        const stats = {};
        
        logs.forEach(log => {
            const shift = getShift(log.cycle_start_time || log.operator_press_time);
            if (!stats[shift]) stats[shift] = { ok: 0, delay: 0, virtual: 0, machine: mDir };
            if (log.status === 'OK') stats[shift].ok++;
            else if (log.status === 'DELAY') stats[shift].delay++;
        });
        
        sessions.forEach(s => {
            const shift = getShift(s.started_at);
            if (!stats[shift]) stats[shift] = { ok: 0, delay: 0, virtual: 0, machine: mDir };
            stats[shift].virtual += countOverlapWindows(s.started_at, s.ended_at);
        });
        
        Object.entries(stats).forEach(([shift, val]) => {
            const actual = val.ok + val.delay;
            if (actual > val.virtual) {
                console.log(`[ANOMALY] Machine ${mDir} Shift ${shift} | Actual: ${actual} | Virtual: ${val.virtual}`);
            }
        });
    }
});
