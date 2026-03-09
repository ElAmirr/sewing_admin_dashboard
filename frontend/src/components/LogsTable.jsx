import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLog as apiDeleteLog, updateLog as apiUpdateLog } from "../api/api";
import { useLanguage } from "../context/LanguageContext";
import { MachineIcon, OperatorIcon, SupervisorIcon } from "./Icons";

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
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const changes = groupByChanges(logs);

  const deleteMutation = useMutation({
    mutationFn: apiDeleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries(["logs"]);
    },
    onError: (err) => {
      alert("Failed to delete log: " + (err.response?.data?.error || err.message));
    }
  });

  const updateMutation = useMutation({
    mutationFn: apiUpdateLog,
    onSuccess: () => {
      setEditingLogId(null);
      queryClient.invalidateQueries(["logs"]);
    },
    onError: (err) => {
      alert("Failed to update log: " + (err.response?.data?.error || err.message));
    }
  });

  const handleDelete = (log) => {
    if (window.confirm(`${t("logsTable.confirmDelete")} ${log.log_id}?`)) {
      deleteMutation.mutate({
        id: log.log_id,
        machine: log.machine,
        cycle_start_time: log.cycle_start_time
      });
    }
  };

  const handleEdit = (log) => {
    setEditingLogId(log.log_id);
    setEditForm({
      status: log.status,
      supervisor_confirmation: log.supervisor_confirmation
    });
  };

  const handleSave = (log) => {
    updateMutation.mutate({
      id: log.log_id,
      machine: log.machine,
      cycle_start_time: log.cycle_start_time,
      ...editForm
    });
  };

  const headerIcons = {
    [t("logsTable.machine")]: <MachineIcon size={16} />,
    [t("logsTable.operator")]: <OperatorIcon size={16} />,
    [t("logsTable.supervisor")]: <SupervisorIcon size={16} />,
  };

  const headers = [
    t("logsTable.id"), t("logsTable.machine"), t("logsTable.operator"),
    t("logsTable.supervisor"), t("logsTable.color"), t("logsTable.status"),
    t("logsTable.press"), t("logsTable.check"), t("logsTable.scan"), t("logsTable.actions")
  ];

  return (
    <div style={{ overflowX: "auto", padding: "1rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr>
            {headers.map((head) => (
              <th key={head} style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {headerIcons[head] || null}
                  {head}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {changes.map((change, index) => (
            <React.Fragment key={index}>
              {/* Cycle header (shown once) */}
              <tr style={{ ...cycleRowStyle, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                <td colSpan={10} style={{ padding: "1rem", color: "var(--text-primary)" }}>
                  {change.isUnspecified ? (
                    <span>{t("logsTable.unspecified")}</span>
                  ) : (
                    <>
                      📅 {formatDateOnly(change.businessDate || change.start)} | 🕒{" "}
                      {formatTime(change.start)} → {formatTime(change.end)}
                    </>
                  )}
                </td>
              </tr>

              {/* Logs inside the changes */}
              {change.logs.map((log) => (
                <tr key={log.log_id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{log.log_id}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{log.machine}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatPerson(log.operator)}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatPerson(log.supervisor)}</td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>
                    {log.color}
                  </td>
                  <td style={{ padding: "1rem", color: statusColor(editingLogId === log.log_id ? editForm.status : log.status) }}>
                    {editingLogId === log.log_id ? (
                      <select
                        value={editForm.status || ""}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        style={styles.select}
                      >
                        <option value="ok">OK</option>
                        <option value="delay">DELAY</option>
                        <option value="none">NONE</option>
                      </select>
                    ) : (
                      (log.status ?? "none").toUpperCase()
                    )}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatTime(log.operator_press_time)}</td>
                  <td style={{ padding: "1rem", color: confirmColor(editingLogId === log.log_id ? editForm.supervisor_confirmation : log.supervisor_confirmation) }}>
                    {editingLogId === log.log_id ? (
                      <select
                        value={editForm.supervisor_confirmation || ""}
                        onChange={(e) => setEditForm({ ...editForm, supervisor_confirmation: e.target.value })}
                        style={styles.select}
                      >
                        <option value="">—</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="NOT_CONFIRMED">NOT_CONFIRMED</option>
                      </select>
                    ) : (
                      log.supervisor_confirmation ?? "—"
                    )}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-primary)" }}>{formatTime(log.supervisor_scan_time)}</td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {editingLogId === log.log_id ? (
                        <>
                          <button onClick={() => handleSave(log)} style={styles.saveBtn} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "..." : t("logsTable.save")}
                          </button>
                          <button onClick={() => setEditingLogId(null)} style={styles.cancelBtn}>{t("logsTable.cancel")}</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(log)} style={styles.editBtn}>{t("logsTable.edit")}</button>
                          <button onClick={() => handleDelete(log)} style={styles.deleteBtn} disabled={deleteMutation.isPending}>
                            {t("logsTable.delete")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
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

function groupByChanges(logs) {
  const map = {};

  logs.forEach((log) => {
    const start = log.cycle_start_time || "Unspecified";
    const end = log.cycle_end_time || "Unspecified";

    const key = `${start}-${end}`;

    if (!map[key]) {
      map[key] = {
        start: log.cycle_start_time || null,
        end: log.cycle_end_time || null,
        businessDate: log.business_date || null,
        logs: [],
        isUnspecified: !log.cycle_start_time || !log.cycle_end_time
      };
    }

    map[key].logs.push(log);
  });

  const changes = Object.values(map);

  changes.forEach((change) => {
    change.logs.sort((a, b) => {
      const ta = a.operator_press_time ? new Date(a.operator_press_time).getTime() : 0;
      const tb = b.operator_press_time ? new Date(b.operator_press_time).getTime() : 0;
      return tb - ta;
    });
  });

  changes.sort((a, b) => {
    if (a.isUnspecified) return 1;
    if (b.isUnspecified) return -1;

    const ta = a.start ? new Date(a.start).getTime() : 0;
    const tb = b.start ? new Date(b.start).getTime() : 0;
    return tb - ta;
  });

  return changes;
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
  if (typeof value === "object") {
    return value.name || "—";
  }
  if (typeof value === "number") return `ID ${value}`;
  return value;
}

const styles = {
  input: {
    background: "#222",
    color: "#fff",
    border: "1px solid #444",
    padding: "4px 8px",
    borderRadius: "4px",
    width: "80px"
  },
  select: {
    background: "#222",
    color: "#fff",
    border: "1px solid #444",
    padding: "4px 8px",
    borderRadius: "4px"
  },
  editBtn: {
    padding: "4px 8px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  },
  deleteBtn: {
    padding: "4px 8px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  },
  saveBtn: {
    padding: "4px 8px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  },
  cancelBtn: {
    padding: "4px 8px",
    background: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }
};
