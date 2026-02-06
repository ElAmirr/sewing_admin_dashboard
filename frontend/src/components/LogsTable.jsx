import React from "react";

/* =====================
   STYLES
===================== */

const cycleRowStyle = {
  fontWeight: "bold",
};

/* =====================
   COMPONENT
===================== */

export default function LogsTable({ logs }) {
  const cycles = groupByCycle(logs);


  return (
    <div style={{ overflowX: "auto", padding: "1rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr>
            {["ID", "Machine", "Operator", "Supervisor", "Color", "Status", "Press", "Check", "Scan"].map((head) => (
              <th key={head} style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>{head}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {cycles.map((cycle, index) => (
            <React.Fragment key={index}>
              {/* Cycle header (shown once) */}
              <tr style={{ ...cycleRowStyle, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                <td colSpan={9} style={{ padding: "1rem", color: "var(--text-primary)" }}>
                  {cycle.isUnspecified ? (
                    <span>⚠️ Unspecified Cycle / Standalone Logs</span>
                  ) : (
                    <>
                      📅 {formatDateOnly(cycle.start)} | 🕒{" "}
                      {formatTime(cycle.start)} → {formatTime(cycle.end)}
                    </>
                  )}
                </td>
              </tr>

              {/* Logs inside the cycle */}
              {cycle.logs.map((log) => (
                <tr key={log.log_id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{log.log_id}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{log.machine}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatPerson(log.operator)}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatPerson(log.supervisor)}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{log.color}</td>
                  <td style={{ padding: "1rem", color: statusColor(log.status) }}>
                    {(log.status ?? "none").toUpperCase()}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatTime(log.operator_press_time)}</td>
                  <td style={{ padding: "1rem", color: confirmColor(log.supervisor_confirmation) }}>
                    {log.supervisor_confirmation ?? "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatTime(log.supervisor_scan_time)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================
   HELPERS
===================== */

function groupByCycle(logs) {
  const map = {};

  logs.forEach((log) => {
    // Fallback for missing cycle times
    const start = log.cycle_start_time || "Unspecified";
    const end = log.cycle_end_time || "Unspecified";

    const key = `${start}-${end}`;

    if (!map[key]) {
      map[key] = {
        start: log.cycle_start_time || null,
        end: log.cycle_end_time || null,
        logs: [],
        isUnspecified: !log.cycle_start_time || !log.cycle_end_time
      };
    }

    map[key].logs.push(log);
  });

  // Convert to array and sort: newest cycles first, and newest logs first inside each cycle
  const cycles = Object.values(map);

  cycles.forEach((cycle) => {
    cycle.logs.sort((a, b) => {
      const ta = a.operator_press_time ? new Date(a.operator_press_time).getTime() : 0;
      const tb = b.operator_press_time ? new Date(b.operator_press_time).getTime() : 0;
      return tb - ta; // newest first
    });
  });

  cycles.sort((a, b) => {
    // Unspecified go to bottom
    if (a.isUnspecified) return 1;
    if (b.isUnspecified) return -1;

    const ta = a.start ? new Date(a.start).getTime() : 0;
    const tb = b.start ? new Date(b.start).getTime() : 0;
    return tb - ta; // newest cycles first
  });

  return cycles;
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";

  return d.toLocaleDateString();
}

function statusColor(status) {
  if (status === "ok") return "green";
  if (status === "delay") return "orange";
  if (!status || status === "none") return "gray";
  return "#999";
}

function confirmColor(value) {
  if (value === "CONFIRMED") return "green";
  if (value === "NOT_CONFIRMED") return "red";
  return "gray";
}

function formatPerson(value) {
  if (!value) return "—";

  // If backend returns an object like { name, badge }
  if (typeof value === "object") {
    return value.name || "—";
  }

  // If it's a number, show a simple ID fallback
  if (typeof value === "number") return `ID ${value}`;

  // Otherwise assume it's a name string
  return value;
}
