const path = require('path');
const fs = require('fs');

function getRootDataDir() {
    const settingsPath = path.resolve(__dirname, '../../setting.json');
    let dataPathFromSettings = null;

    try {
        if (fs.existsSync(settingsPath)) {
            const settingsData = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(settingsData);
            if (settings.dataPath) {
                dataPathFromSettings = path.isAbsolute(settings.dataPath)
                    ? settings.dataPath
                    : path.resolve(path.dirname(settingsPath), settings.dataPath);
            }
        }
    } catch (error) {
        console.error('Error reading setting.json:', error);
    }

    return process.env.DATA_PATH || dataPathFromSettings || path.resolve(__dirname, '../../data');
}

module.exports = { getRootDataDir };
