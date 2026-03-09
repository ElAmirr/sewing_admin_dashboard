import axios from "axios";
import { format, addDays } from "date-fns";

const BASE_URL = "http://localhost:3001/api";

async function verifyShift() {
    console.log("--- Shift-Aware Logging Verification Start ---");

    try {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

        // Use a fixed hour to test the threshold (10 PM tonight)
        const nightLogTime = new Date();
        nightLogTime.setHours(22, 0, 0, 0);
        const isoTime = nightLogTime.toISOString();

        console.log(`Creating a log for TONIGHT at 10:00 PM: ${isoTime}`);
        console.log(`Expected Business Date: ${tomorrowStr}`);

        // 1. Create Log
        const createRes = await axios.post(`${BASE_URL}/logs`, {
            machine: 1,
            operator: 1,
            supervisor: 1,
            color: "SHIFT_TEST",
            status: "ok",
            operator_press_time: isoTime,
            cycle_start_time: isoTime,
            cycle_end_time: isoTime
        });
        console.log("Create response ID:", createRes.data.id);

        // 2. Fetch logs for TOMORROW (Business Date)
        console.log(`Fetching logs for Business Date: ${tomorrowStr}`);
        const fetchRes = await axios.get(`${BASE_URL}/logs`, {
            params: {
                startDate: tomorrowStr,
                endDate: tomorrowStr
            }
        });

        const logs = fetchRes.data;
        const testLog = logs.find(l => l.color === "SHIFT_TEST");

        if (testLog) {
            console.log("✅ SUCCESS: Log found in tomorrow's business day!");
            console.log("Log Business Date from API:", testLog.business_date);

            // Clean up
            console.log("Cleaning up test log...");
            await axios.delete(`${BASE_URL}/logs/${testLog.log_id}`, {
                params: {
                    machine: 1,
                    cycle_start_time: isoTime
                }
            });
            console.log("Cleanup done.");
        } else {
            console.error("❌ FAILURE: Log NOT found in tomorrow's business day.");
            console.log("Logs found:", logs.length);
        }

    } catch (error) {
        console.error("Verification error:", error.response?.data || error.message);
    }

    console.log("--- Shift-Aware Logging Verification End ---");
}

verifyShift();
