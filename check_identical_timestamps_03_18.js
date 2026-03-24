const fs = require('fs');
const path = require('path');

const dataDir = '/home/user/Téléchargements/swisstransfer_4d53fe01-c181-4da5-866b-e8c186cecd32/data';
const targetDate = '2026-03-18.json';
const machines = fs.readdirSync(dataDir).filter(f => f.startsWith('machine_'));

machines.forEach(mDir => {
    const filePath = path.join(dataDir, mDir, targetDate);
    if (fs.existsSync(filePath)) {
        const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const seen = new Set();
        logs.forEach(log => {
            const key = log.operator_press_time;
            if (seen.has(key)) {
                console.log(`[IDENTICAL TIMESTAMP] Machine ${mDir} | Time ${key}`);
            }
            seen.add(key);
        });
    }
});
