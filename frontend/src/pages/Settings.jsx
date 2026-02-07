import React, { useState, useEffect } from 'react';

const Settings = () => {
    const [dataPath, setDataPath] = useState('');
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [logs, setLogs] = useState('');
    const [backendStatus, setBackendStatus] = useState('Checking...');

    const checkBackendStatus = async () => {
        try {
            const response = await fetch('http://localhost:3001/health');
            if (response.ok) {
                setBackendStatus('✅ Running');
            } else {
                setBackendStatus('❌ Not Running');
            }
        } catch (error) {
            setBackendStatus('❌ Not Running');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (window.electron && window.electron.getSettings) {
                try {
                    const settings = await window.electron.getSettings();
                    setDataPath(settings.dataPath);
                } catch (err) {
                    console.error("Failed to fetch settings:", err);
                }
            }
            if (window.electron && window.electron.getBackendLogs) {
                try {
                    const backendLogs = await window.electron.getBackendLogs();
                    setLogs(backendLogs);
                } catch (err) {
                    console.error("Failed to fetch logs:", err);
                }
            }
            await checkBackendStatus();
            setLoading(false);
        };
        fetchData();
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

    const refreshLogs = async () => {
        if (window.electron && window.electron.getBackendLogs) {
            const backendLogs = await window.electron.getBackendLogs();
            setLogs(backendLogs);
        }
        await checkBackendStatus();
    };

    if (loading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Application Settings</h1>

            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Data Storage</h2>
                    <span className={`px-3 py-1 rounded text-sm font-bold ${backendStatus.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        Backend: {backendStatus}
                    </span>
                </div>

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

            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Backend Debug Logs</h2>
                    <button
                        onClick={refreshLogs}
                        className="text-sm px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                    >
                        Refresh Logs
                    </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs h-64 overflow-auto font-mono">
                    {logs || "No logs available yet."}
                </pre>
                <p className="text-xs text-gray-500 mt-2">
                    If data is not loading, check the logs above for "ERROR" or incorrect "DATA_DIR" paths.
                </p>
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
