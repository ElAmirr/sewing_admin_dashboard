const fs = require('fs');
const path = require('path');

const dataDir = '/home/user/Téléchargements/swisstransfer_4d53fe01-c181-4da5-866b-e8c186cecd32/data';
const targetDate = '2026-03-18.json';
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
    const sessionPath = path.join(dataDir, mDir, 'sessions', targetDate);
    if (fs.existsSync(sessionPath)) {
        const sessions = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        let machineVirtual = 0;
        sessions.forEach(s => {
            if (getShift(s.started_at) === 'shift2') {
                machineVirtual += countOverlapWindows(s.started_at, s.ended_at);
            }
        });
        if (machineVirtual > 0) {
            console.log(`${mDir}: ${machineVirtual} Virtual Windows`);
        }
    }
});
