import React, { useMemo } from "react";
import { formatDistanceStrict } from "date-fns";

export default function KPI({ logs, sessions }) {
    const metrics = useMemo(() => {
        // --- Logs Metrics ---
        let totalResponseTime = 0;
        let responseCount = 0;
        let reviewedCount = 0;
        let validCount = 0;
        let okCount = 0;
        let delayCount = 0;

        const operatorStats = {};
        const supervisorStats = {};

        if (logs && logs.length > 0) {
            logs.forEach((log) => {
                if (log.status === "OK") okCount++;
                if (log.status === "DELAY") delayCount++;

                if (log.supervisor_confirmation === "CONFIRMED" || log.supervisor_confirmation === "NOT_CONFIRMED") {
                    reviewedCount++;
                    if (log.supervisor_confirmation === "CONFIRMED") validCount++;
                    if (log.supervisor) {
                        const name = log.supervisor.name || `ID ${log.supervisor_id}`;
                        supervisorStats[name] = (supervisorStats[name] || 0) + 1;
                    }
                }

                if (log.operator_press_time && log.supervisor_scan_time) {
                    const press = new Date(log.operator_press_time).getTime();
                    const scan = new Date(log.supervisor_scan_time).getTime();
                    if (scan > press) {
                        totalResponseTime += (scan - press);
                        responseCount++;
                    }
                }

                if (log.operator) {
                    const name = log.operator.name || `ID ${log.operator_id || "?"}`;
                    if (!operatorStats[name]) {
                        operatorStats[name] = { name, total: 0, ok: 0, delay: 0, confirmed: 0 };
                    }
                    operatorStats[name].total++;
                    if (log.status === "OK") operatorStats[name].ok++;
                    if (log.status === "DELAY") operatorStats[name].delay++;
                    if (log.supervisor_confirmation === "CONFIRMED") operatorStats[name].confirmed++;
                }
            });
        }

        const avgResponseMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
        const avgResponseStr = responseCount > 0 ? formatDistanceStrict(0, avgResponseMs) : "N/A";
        const supervisorActivity = logs.length > 0 ? ((reviewedCount / logs.length) * 100).toFixed(1) : "0.0";
        const credibilityScore = reviewedCount > 0 ? ((validCount / reviewedCount) * 100).toFixed(1) : "N/A";
        const okRate = logs.length > 0 ? ((okCount / logs.length) * 100).toFixed(1) : "0.0";
        const delayRate = logs.length > 0 ? ((delayCount / logs.length) * 100).toFixed(1) : "0.0";

        const rankedOperators = Object.values(operatorStats).sort((a, b) => b.total - a.total);
        const rankedSupervisors = Object.entries(supervisorStats).sort(([, a], [, b]) => b - a);

        // --- Session Metrics ---
        let activeOperatorsCount = 0;
        let totalManHoursStr = "0h";

        if (sessions && sessions.length > 0) {
            // Unique Operators
            const uniqueOps = new Set(sessions.map(s => s.operator_id));
            activeOperatorsCount = uniqueOps.size;

            // Total Hours
            const totalDurationMs = sessions.reduce((acc, s) => {
                const start = new Date(s.started_at).getTime();
                const end = new Date(s.ended_at).getTime();
                return acc + (end - start);
            }, 0);

            // Manual formatting to hours
            const hours = Math.floor(totalDurationMs / (1000 * 60 * 60));
            const mins = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
            totalManHoursStr = `${hours}h ${mins}m`;
        }

        return {
            avgResponseStr,
            supervisorActivity,
            credibilityScore,
            okRate,
            delayRate,
            totalLogs: logs ? logs.length : 0,
            statusBreakdown: { ok: okCount, delay: delayCount },
            topOperator: rankedOperators[0] || { name: "-", total: 0 },
            topSupervisor: rankedSupervisors[0] || ["-", 0],
            allOperators: rankedOperators,
            sessionMetrics: {
                activeOperators: activeOperatorsCount,
                totalManHours: totalManHoursStr
            }
        };
    }, [logs, sessions]);

    // Only render loading if absolutely no data structure, but metrics will always return object now.
    if (!metrics) {
        return <div style={{ padding: "2rem" }}>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                {/* Session Stats */}
                <Card
                    title="Active Operators"
                    value={metrics.sessionMetrics.activeOperators}
                    color="#fff"
                    hint="Number of unique operators with active sessions today."
                />
                <Card
                    title="Total Man-Hours"
                    value={metrics.sessionMetrics.totalManHours}
                    color="#fff"
                    hint="Total duration of all operator sessions today."
                />

                {/* KPI Cards */}
                <Card
                    title="Supervisor Activity"
                    value={`${metrics.supervisorActivity}%`}
                    color="#60a5fa"
                    hint="Percentage of total logs reviewed by a supervisor (Confirmed or Not Confirmed)."
                />
                <Card
                    title="Operator Credibility"
                    value={`${metrics.credibilityScore}%`}
                    color="#f472b6"
                    hint="Percentage of REVIEWED logs that were CONFIRMED. 100% = All reviewed statuses were correct."
                />
                <Card
                    title="Operator Compliance (OK)"
                    value={`${metrics.okRate}%`}
                    color="#4ade80"
                    hint="Percentage of total cycles marked as OK."
                />
                <Card
                    title="Operator Compliance (DELAY)"
                    value={`${metrics.delayRate}%`}
                    color="#fb923c"
                    hint="Percentage of total cycles marked as DELAY."
                />
                <Card
                    title="Avg Supervisor Response"
                    value={metrics.avgResponseStr}
                    color="#a78bfa"
                    hint="Average time taken for supervisor to scan badge after operator press."
                />

                <div style={styles.wideCard}>
                    <h3>🏆 Top Performers</h3>
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1rem" }}>
                        <div>
                            <div style={styles.subLabel}>Top Operator</div>
                            <div style={styles.performer}>{metrics.topOperator.name}</div>
                            <div style={styles.subVal}>{metrics.topOperator.total} cycles</div>
                        </div>
                        <div style={{ borderLeft: "1px solid #333" }}></div>
                        <div>
                            <div style={styles.subLabel}>Most Active Supervisor</div>
                            <div style={styles.performer}>{metrics.topSupervisor[0]}</div>
                            <div style={styles.subVal}>{metrics.topSupervisor[1]} confirmations</div>
                        </div>
                    </div>
                </div>

                <div style={styles.wideCard}>
                    <h3>⚙️ Daily Overview</h3>
                    <p style={{ textAlign: "center", fontSize: "1.1rem", marginTop: "10px" }}>
                        Running Total: <strong style={{ color: "#fff" }}>{metrics.totalLogs} Cycles</strong>
                    </p>
                    <div style={{ display: "flex", gap: "20px", marginTop: "10px", justifyContent: "center" }}>
                        <div style={{ color: "#4ade80" }}>OK: {metrics.statusBreakdown.ok}</div>
                        <div style={{ color: "orange" }}>DELAY: {metrics.statusBreakdown.delay}</div>
                    </div>
                </div>
            </div>

            <h3 style={{ margin: "2rem 0 1rem 1rem", color: "#ccc" }}>👷 Operator Performance Breakdown</h3>
            <div style={{ overflowX: "auto", padding: "0 1rem" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Operator</th>
                            <th style={styles.th}>Total Cycles</th>
                            <th style={styles.th}>✅ OK</th>
                            <th style={styles.th}>⚠️ Delay</th>
                            <th style={styles.th}>👀 Sup. Confirmed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.allOperators.map((op, idx) => (
                            <tr key={idx} style={styles.tr}>
                                <td style={styles.td}>{op.name}</td>
                                <td style={styles.td}>{op.total}</td>
                                <td style={{ ...styles.td, color: "#4ade80" }}>{op.ok}</td>
                                <td style={{ ...styles.td, color: "#fb923c" }}>{op.delay}</td>
                                <td style={{ ...styles.td, color: "#60a5fa" }}>{op.confirmed}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Card({ title, value, color, hint }) {
    return (
        <div style={{ ...styles.card, borderTop: `4px solid ${color}` }} className="kpi-card">
            <div style={styles.header}>
                <h4 style={styles.cardTitle}>{title}</h4>
                {hint && (
                    <div style={styles.infoIcon} title={hint}>?</div>
                )}
            </div>
            <div style={{ ...styles.cardValue, color: color }}>{value}</div>
        </div>
    );
}

const styles = {
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.5rem",
        padding: "1rem",
    },
    card: {
        background: "#1e1e1e",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        textAlign: "center",
        position: "relative",
    },
    header: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        marginBottom: "10px",
    },
    infoIcon: {
        background: "#333",
        color: "#aaa",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "help",
    },
    wideCard: {
        gridColumn: "span 2",
        background: "#1e1e1e",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
    },
    cardTitle: {
        margin: 0,
        color: "#aaa",
        fontSize: "0.9rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    cardValue: {
        fontSize: "2.5rem",
        fontWeight: "bold",
    },
    subLabel: { color: "#888", fontSize: "0.85rem", textTransform: "uppercase" },
    performer: { fontSize: "1.2rem", fontWeight: "bold", color: "#fff", margin: "5px 0" },
    subVal: { color: "#666", fontSize: "0.9rem" },
    container: { paddingBottom: "2rem" },
    table: { width: "100%", borderCollapse: "collapse", background: "#1e1e1e", borderRadius: "8px", overflow: "hidden" },
    th: { padding: "1rem", textAlign: "left", color: "#888", borderBottom: "1px solid #333" },
    td: { padding: "1rem", borderBottom: "1px solid #333", color: "#ddd" },
    tr: { transition: "background 0.2s" }
};
