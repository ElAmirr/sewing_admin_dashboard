import axios from "axios";

const BASE_URL = "http://localhost:3001/api";

async function verify() {
    console.log("--- Log Management Verification Start ---");

    try {
        // 1. Fetch logs to get a real ID and context
        const res = await axios.get(`${BASE_URL}/logs`);
        const logs = res.data;

        if (logs.length === 0) {
            console.log("No logs found to test with.");
            return;
        }

        const logToTest = logs[0];
        console.log(`Testing with Log ID: ${logToTest.log_id}, Machine: ${logToTest.machine}`);

        // 2. Update Log
        console.log("Updating log...");
        const updateRes = await axios.put(`${BASE_URL}/logs/${logToTest.log_id}`, {
            machine: logToTest.machine,
            cycle_start_time: logToTest.cycle_start_time,
            color: "VERIFIED_COLOR",
            status: "ok"
        });
        console.log("Update response:", updateRes.data);

        // 3. Verify Update
        const verifyUpdateRes = await axios.get(`${BASE_URL}/logs`);
        const updatedLog = verifyUpdateRes.data.find(l => l.log_id === logToTest.log_id);
        console.log("Updated log color:", updatedLog?.color);

        if (updatedLog?.color === "VERIFIED_COLOR") {
            console.log("✅ Update successful!");
        } else {
            console.error("❌ Update failed!");
        }

        // 4. Delete Log
        console.log("Deleting log...");
        const deleteRes = await axios.delete(`${BASE_URL}/logs/${logToTest.log_id}`, {
            params: {
                machine: logToTest.machine,
                cycle_start_time: logToTest.cycle_start_time
            }
        });
        console.log("Delete response:", deleteRes.data);

        // 5. Verify Deletion
        const verifyDeleteRes = await axios.get(`${BASE_URL}/logs`);
        const deletedLog = verifyDeleteRes.data.find(l => l.log_id === logToTest.log_id);

        if (!deletedLog) {
            console.log("✅ Deletion successful!");
        } else {
            console.error("❌ Deletion failed!");
        }

    } catch (error) {
        console.error("Verification error:", error.response?.data || error.message);
    }

    console.log("--- Log Management Verification End ---");
}

verify();
