import React, { useState, useEffect } from 'react';

const Settings = () => {
    const [dataPath, setDataPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            if (window.electron && window.electron.getSettings) {
                const settings = await window.electron.getSettings();
                setDataPath(settings.dataPath);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSelectFolder = async () => {
        if (window.electron && window.electron.selectFolder) {
            const selectedPath = await window.electron.selectFolder();
            if (selectedPath) {
                setDataPath(selectedPath);
            }
        }
    };

    const handleSave = async () => {
        if (window.electron && window.electron.saveSettings) {
            await window.electron.saveSettings({ dataPath });
            setSuccessMessage('Settings saved successfully! Restarting application...');
            setTimeout(() => {
                window.electron.restartApp();
            }, 2000);
        }
    };

    if (loading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Application Settings</h1>

            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Data Storage</h2>
                <p className="text-gray-600 mb-6 italic">
                    Select where the database and log files are stored. Changing this will restart the application.
                </p>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Data Path
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={dataPath}
                            readOnly
                            className="flex-1 p-2 border border-gray-300 rounded bg-gray-50 text-sm overflow-hidden text-ellipsis"
                        />
                        <button
                            onClick={handleSelectFolder}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Browse
                        </button>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!dataPath}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition disabled:opacity-50"
                    >
                        Save & Restart
                    </button>
                </div>

                {successMessage && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded border border-green-200">
                        {successMessage}
                    </div>
                )}
            </div>

            {!window.electron && (
                <div className="mt-8 p-4 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
                    <strong>Note:</strong> You are running in a browser. Settings changes only take effect when running as an Electron App.
                </div>
            )}
        </div>
    );
};

export default Settings;
