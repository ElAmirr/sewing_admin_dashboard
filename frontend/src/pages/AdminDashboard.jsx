import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchSessions } from "../api/api";
import { format } from "date-fns";
import LogsTable from "../components/LogsTable";
import Navbar from "../components/Navbar";
import Statistics from "../components/Statistics";
import KPI from "../components/KPI";

export default function AdminDashboard() {
  const [active, setActive] = useState("logs");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: logs = [], isLoading: logsLoading, isError: logsError, error: logsErrorObj } = useQuery({
    queryKey: ["logs", { startDate: date, endDate: date }],
    queryFn: fetchLogs,
    refetchInterval: 30000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", { startDate: date, endDate: date }],
    queryFn: fetchSessions,
    refetchInterval: 30000,
  });

  const isLoading = logsLoading;
  const isError = logsError;
  const error = logsErrorObj;

  return (
    <div>
      <Navbar active={active} onChange={setActive} />

      <div style={{ padding: "1rem" }}>
        <label>
          <strong>Select Date: </strong>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "5px", marginLeft: "10px" }}
          />
        </label>
      </div>

      {isLoading && <p>Loading logs...</p>}
      {isError && <p style={{ color: "red" }}>Error: {error.message}</p>}

      {!isLoading && !isError && active === "logs" && logs.length === 0 && (
        <p>No logs available for {date}.</p>
      )}

      {!isLoading && !isError && active === "logs" && logs.length > 0 && (
        <LogsTable logs={logs} />
      )}

      {!isLoading && !isError && active === "stats" && (
        <Statistics logs={logs} />
      )}

      {!isLoading && !isError && active === "kpi" && (
        <KPI logs={logs} sessions={sessions} />
      )}
    </div>
  );
}