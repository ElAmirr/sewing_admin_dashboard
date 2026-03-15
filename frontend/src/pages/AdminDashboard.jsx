import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchSessions, fetchMachines } from "../api/api";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { DateIcon, ShiftIcon, MachineIcon } from "../components/Icons";
import LogsTable from "../components/LogsTable";
import Navbar from "../components/Navbar";
import Statistics from "../components/Statistics";
import KPI from "../components/KPI";
import Management from "./Management";
import Monitoring from "./Monitoring";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [active, setActive] = useState(isSuperAdmin ? "logs" : "kpi");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [shift, setShift] = useState("all");
  const [machineType, setMachineType] = useState("all");
  const [daysRange, setDaysRange] = useState(1);

  const parsedDate = new Date(date);
  const isValidDate = !isNaN(parsedDate.getTime());

  const monthStart = isValidDate ? format(startOfMonth(parsedDate), "yyyy-MM-dd") : "";
  const monthEnd = isValidDate ? format(endOfMonth(parsedDate), "yyyy-MM-dd") : "";

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: fetchMachines,
  });

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

  // Create a map for quick machine lookup
  const machineMap = useMemo(() => {
    const map = {};
    machines.forEach(m => {
      map[m.machine_id] = m.code;
    });
    return map;
  }, [machines]);

  // Combined filtering logic
  const getFilteredData = (data, isSession = false) => {
    return data.filter(item => {
      // 1. Shift Filter
      const startTime = isSession ? item.started_at : item.cycle_start_time;
      if (!startTime) return false;

      let passShift = true;
      if (shift !== "all") {
        const h = new Date(startTime).getHours();
        if (shift === "shift1") passShift = (h >= 22 || h < 6);
        else if (shift === "shift2") passShift = (h >= 6 && h < 14);
        else if (shift === "shift3") passShift = (h >= 14 && h < 22);
      }

      // 2. Machine Type Filter
      let passMachine = true;
      if (machineType !== "all") {
        const id = item.machine_id || item.machine;
        const code = machineMap[id] || "";
        passMachine = code.startsWith(machineType);
      }

      return passShift && passMachine;
    });
  };

  const filteredLogs = useMemo(() => getFilteredData(logs), [logs, shift, machineType, machineMap]);
  const filteredSessions = useMemo(() => getFilteredData(sessions, true), [sessions, shift, machineType, machineMap]);

  // Monthly data for Statistics
  const { data: monthlyLogs = [] } = useQuery({
    queryKey: ["logs", { startDate: monthStart, endDate: monthEnd }],
    queryFn: fetchLogs,
    enabled: active === "stats",
  });

  const { data: monthlySessions = [] } = useQuery({
    queryKey: ["sessionsFixed", { startDate: monthStart, endDate: monthEnd }],
    queryFn: fetchSessions,
    enabled: active === "stats",
  });

  const filteredMonthlyLogs = useMemo(() => getFilteredData(monthlyLogs), [monthlyLogs, shift, machineType, machineMap]);
  const filteredMonthlySessions = useMemo(() => getFilteredData(monthlySessions, true), [monthlySessions, shift, machineType, machineMap]);

  const isLoading = logsLoading;
  const isError = logsError;
  const error = logsErrorObj;

  return (
    <div>
      <Navbar active={active} onChange={setActive} />

      <div style={{ padding: "1rem", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
        <div style={styles.filterGroup}>
          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}><DateIcon size={18} /> {t("filters.date")}: </strong>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.filterGroup}>
          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}><ShiftIcon size={18} /> {t("filters.shift")}: </strong>
          <select value={shift} onChange={(e) => setShift(e.target.value)} style={styles.input}>
            <option value="all">{t("filters.allShifts")}</option>
            <option value="shift1">{t("filters.shift1")}</option>
            <option value="shift2">{t("filters.shift2")}</option>
            <option value="shift3">{t("filters.shift3")}</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}><MachineIcon size={18} /> {t("filters.machine")}: </strong>
          <select value={machineType} onChange={(e) => setMachineType(e.target.value)} style={styles.input}>
            <option value="all">{t("filters.allTypes")}</option>
            <option value="RH">{t("filters.roundHead")}</option>
            <option value="FH">{t("filters.flatHead")}</option>
          </select>
        </div>

        {active === "stats" && (
          <div style={styles.filterGroup}>
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}><ShiftIcon size={18} /> Range: </strong>
            <select value={daysRange} onChange={(e) => setDaysRange(parseInt(e.target.value))} style={styles.input}>
              <option value={1}>1 Day</option>
              <option value={2}>2 Days</option>
              <option value={3}>3 Days</option>
            </select>
          </div>
        )}
      </div>

      {isLoading && <p style={{ padding: "2rem", textAlign: "center" }}>{t("status.loading")}</p>}
      {isError && <p style={{ color: "red", padding: "2rem" }}>Error: {error.message}</p>}

      {!isLoading && !isError && active === "logs" && (
        filteredLogs.length === 0
          ? <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>{t("status.noLogs")}</p>
          : <LogsTable logs={filteredLogs} />
      )}

      {!isLoading && !isError && active === "stats" && (
        <Statistics sessions={filteredMonthlySessions} logs={filteredMonthlyLogs} shift={shift} date={date} daysRange={daysRange} />
      )}

      {active === "management" && <Management />}

      {active === "monitoring" && <Monitoring />}

      {!isLoading && !isError && active === "kpi" && (
        <KPI logs={filteredLogs} sessions={filteredSessions} />
      )}
    </div>
  );
}

const styles = {
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  input: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
  }
};