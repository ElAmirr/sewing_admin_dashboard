import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchActiveSessions, forceLogout } from "../api/api";
import { useLanguage } from "../context/LanguageContext";
import { formatDistanceToNow, parseISO } from "date-fns";
import { MachineIcon, OperatorIcon, ClockIcon } from "../components/Icons";

export default function Monitoring() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const { data: activeSessions = [], isLoading, isError } = useQuery({
        queryKey: ["activeSessions"],
        queryFn: fetchActiveSessions,
        refetchInterval: 10000, // Poll every 10 seconds for real-time feel
    });

    const logoutMutation = useMutation({
        mutationFn: forceLogout,
        onSuccess: () => {
            queryClient.invalidateQueries(["activeSessions"]);
            queryClient.invalidateQueries(["sessions"]);
        },
        onError: (err) => {
            alert("Failed to force logout: " + (err.response?.data?.error || err.message));
        }
    });

    const handleForceLogout = (session) => {
        if (window.confirm(t("monitoring.confirmLogout"))) {
            logoutMutation.mutate({
                sessionId: session.session_id,
                machine_id: session.machine_id,
                started_at: session.started_at
            });
        }
    };

    if (isLoading) return <div style={styles.center}>{t("status.loading")}</div>;
    if (isError) return <div style={styles.center}>{t("status.error")}</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>{t("monitoring.title") || "Live Monitoring"}</h2>
                <p style={styles.subtitle}>{t("monitoring.subtitle") || "Real-time view of active machine sessions"}</p>
            </div>

            {activeSessions.length === 0 ? (
                <div style={styles.noData}>{t("monitoring.noActiveSessions") || "No active sessions found."}</div>
            ) : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.theadRow}>
                                <th style={styles.th}><MachineIcon size={16} /> {t("logsTable.machine")}</th>
                                <th style={styles.th}><OperatorIcon size={16} /> {t("logsTable.operator")}</th>
                                <th style={styles.th}>{t("monitoring.badge") || "Badge"}</th>
                                <th style={styles.th}><ClockIcon size={16} /> {t("monitoring.startedSince") || "Started Since"}</th>
                                <th style={styles.th}>{t("monitoring.lastActivity") || "Last Activity"}</th>
                                <th style={styles.th}>{t("logsTable.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeSessions.map((session) => (
                                <tr key={session.session_id} style={styles.tr}>
                                    <td style={styles.td}>Machine {session.machine_id}</td>
                                    <td style={styles.td}>{session.operator_id}</td>
                                    <td style={styles.td}>
                                        <code>{session.badge}</code>
                                    </td>
                                    <td style={styles.td}>
                                        {session.started_at ? formatDistanceToNow(parseISO(session.started_at), { addSuffix: true }) : "—"}
                                    </td>
                                    <td style={styles.td}>
                                        {session.last_heartbeat ? formatDistanceToNow(parseISO(session.last_heartbeat), { addSuffix: true }) : "—"}
                                    </td>
                                    <td style={styles.td}>
                                        <button
                                            onClick={() => handleForceLogout(session)}
                                            style={styles.logoutBtn}
                                            disabled={logoutMutation.isPending}
                                        >
                                            {logoutMutation.isPending ? "..." : t("monitoring.logout") || "Force Logout"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    header: {
        marginBottom: "2rem",
    },
    title: {
        fontSize: "1.8rem",
        color: "#fff",
        margin: 0,
    },
    subtitle: {
        color: "var(--text-secondary)",
        marginTop: "0.5rem",
    },
    center: {
        padding: "4rem",
        textAlign: "center",
        color: "var(--text-secondary)",
    },
    noData: {
        background: "var(--bg-card)",
        padding: "3rem",
        textAlign: "center",
        borderRadius: "12px",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-color)",
    },
    tableWrapper: {
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
    },
    theadRow: {
        background: "rgba(255,255,255,0.05)",
        borderBottom: "1px solid var(--border-color)",
    },
    th: {
        padding: "1rem",
        color: "var(--text-secondary)",
        fontWeight: "600",
        fontSize: "0.85rem",
        textTransform: "uppercase",
    },
    tr: {
        borderBottom: "1px solid var(--border-color)",
        transition: "background 0.2s",
    },
    td: {
        padding: "1rem",
        color: "var(--text-primary)",
        fontSize: "0.95rem",
    },
    logoutBtn: {
        background: "#ff4444",
        color: "white",
        border: "none",
        padding: "6px 12px",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "0.85rem",
        fontWeight: "bold",
        transition: "background 0.2s",
    }
};
