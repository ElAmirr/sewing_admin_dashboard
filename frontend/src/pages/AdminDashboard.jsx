import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchSessions } from "../api/api";
import { format, startOfMonth, endOfMonth } from "date-fns";
import LogsTable from "../components/LogsTable";
import Navbar from "../components/Navbar";
import Statistics from "../components/Statistics";
import KPI from "../components/KPI";
import Management from "./Management";

export default function AdminDashboard() {
  const [active, setActive] = useState("logs");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const parsedDate = new Date(date);
  const isValidDate = !isNaN(parsedDate.getTime());

  const monthStart = isValidDate ? format(startOfMonth(parsedDate), "yyyy-MM-dd") : "";
  const monthEnd = isValidDate ? format(endOfMonth(parsedDate), "yyyy-MM-dd") : "";

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

  // Monthly data for Statistics
  const { data: monthlyLogs = [] } = useQuery({
    queryKey: ["logs", { startDate: monthStart, endDate: monthEnd }],
    queryFn: fetchLogs,
    enabled: active === "stats",
  });

  const { data: monthlySessions = [] } = useQuery({
    queryKey: ["sessions", { startDate: monthStart, endDate: monthEnd }],
    queryFn: fetchSessions,
    enabled: active === "stats",
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
            style={{
              padding: "8px",
              marginLeft: "10px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
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
        <Statistics sessions={monthlySessions} logs={monthlyLogs} />
      )}

      {active === "management" && <Management />}

      {!isLoading && !isError && active === "kpi" && (
        <KPI logs={logs} sessions={sessions} />
      )}
    </div>
  );
}