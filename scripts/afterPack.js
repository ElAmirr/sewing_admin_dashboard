const fs = require('fs-extra');
const path = require('path');

exports.default = async function (context) {
    const appOutDir = context.appOutDir;
    const resourcesDir = path.join(appOutDir, 'resources');
    const backendSource = path.join(context.packager.projectDir, 'backend');
    const backendDest = path.join(resourcesDir, 'backend');

    console.log('AfterPack: Copying backend folder...');
    console.log('From:', backendSource);
    console.log('To:', backendDest);

    // Remove the existing backend folder if it exists
    if (fs.existsSync(backendDest)) {
        fs.removeSync(backendDest);
    }

    // Copy the entire backend folder including node_modules
    fs.copySync(backendSource, backendDest, {
        filter: (src) => {
            // Exclude .git folders
            return !src.includes('.git');
        }
    });

    console.log('AfterPack: Backend folder copied successfully');
};
