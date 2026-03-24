const fs = require('fs');
const path = require('path');

const dataDir = '/home/user/Téléchargements/swisstransfer_4d53fe01-c181-4da5-866b-e8c186cecd32/data';
const targetDate = '2026-03-18.json';
const machines = fs.readdirSync(dataDir).filter(f => f.startsWith('machine_'));

machines.forEach(mDir => {
    const filePath = path.join(dataDir, mDir, targetDate);
    if (fs.existsSync(filePath)) {
        const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        logs.forEach((log, index) => {
            if (!log.cycle_start_time || !log.operator_press_time || !log.status) {
                console.log(`[NULL VALUE] Machine ${mDir} | Log Index ${index} | Fields: ${Object.keys(log).filter(k=>!log[k])}`);
            }
        });
    }
});
