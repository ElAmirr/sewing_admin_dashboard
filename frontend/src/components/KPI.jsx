import React, { useMemo } from "react";
import { formatDistanceStrict } from "date-fns";
import { useLanguage } from "../context/LanguageContext";

export default function KPI({ logs, sessions }) {
    const { t } = useLanguage();

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
        let noneCount = 0;
        let virtualTotal = 0;

        const getShift = (dateStr) => {
            const h = new Date(dateStr).getHours();
            if (h >= 21 || h < 5) return "shift1";
            if (h >= 5 && h < 13) return "shift2";
            if (h >= 13 && h < 21) return "shift3";
            return "unknown";
        };

        const processedLogs = logs ? [...logs] : [];
        if (processedLogs.length > 0) {
            processedLogs.forEach((log) => {
                const status = log.status?.toUpperCase();
                if (status === "OK") okCount++;
                else if (status === "DELAY") delayCount++;

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
                    const status = log.status?.toUpperCase();
                    if (status === "OK") operatorStats[name].ok++;
                    if (status === "DELAY") operatorStats[name].delay++;
                    if (log.supervisor_confirmation === "CONFIRMED") operatorStats[name].confirmed++;
                }
            });
        }

        if (sessions && sessions.length > 0) {
            let totalExpectedChanges = 0;
            const now = new Date().getTime();

            sessions.forEach(s => {
                if (!s.started_at) return;
                const start = new Date(s.started_at).getTime();
                const end = s.ended_at ? new Date(s.ended_at).getTime() : now;

                const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
                // 1 change per 2 hours. Rounding to 2 decimal places to be precise 
                // but we can round the final total at the end.
                totalExpectedChanges += durationHours / 2;
            });
            virtualTotal = Math.round(totalExpectedChanges);
        } else {
            virtualTotal = okCount + delayCount;
        }
        noneCount = Math.max(0, virtualTotal - okCount - delayCount);

        const avgResponseMs = responseCount > 0 ? totalResponseTime / responseCount : 0;
        const avgResponseStr = responseCount > 0 ? formatDistanceStrict(0, avgResponseMs) : "N/A";
        const supervisorActivity = logs.length > 0 ? ((reviewedCount / logs.length) * 100).toFixed(1) : "0.0";
        const credibilityScore = reviewedCount > 0 ? ((validCount / reviewedCount) * 100).toFixed(1) : "N/A";
        const actualTotal = okCount + delayCount + noneCount;
        const okRateNum = actualTotal > 0 ? (okCount / actualTotal) * 100 : 0;
        const delayRateNum = actualTotal > 0 ? (delayCount / actualTotal) * 100 : 0;

        const okRate = okRateNum.toFixed(1);
        const delayRate = delayRateNum.toFixed(1);
        // Important: noneRate is the remaining to ensure 100% total
        const noneRate = (100 - parseFloat(okRate) - parseFloat(delayRate)).toFixed(1);

        const totalComplianceRate = actualTotal > 0 ? (((okCount + delayCount) / actualTotal) * 100).toFixed(1) : "0.0";

        const rankedOperators = Object.values(operatorStats).sort((a, b) => b.total - a.total);
        const rankedSupervisors = Object.entries(supervisorStats).sort(([, a], [, b]) => b - a);

        let activeOperatorsCount = 0;
        let machineUtilization = "0.0";
        let avgWorkHoursStr = "0h 0m";

        if (sessions && sessions.length > 0) {
            const uniqueOps = new Set(sessions.map(s => s.operator_id));
            activeOperatorsCount = uniqueOps.size;

            const totalDurationMs = sessions.reduce((acc, s) => {
                const start = new Date(s.started_at).getTime();
                const end = new Date(s.ended_at).getTime();
                return acc + (end - start);
            }, 0);

            if (activeOperatorsCount > 0) {
                const avgDurationMs = totalDurationMs / activeOperatorsCount;
                const h = Math.floor(avgDurationMs / (1000 * 60 * 60));
                const m = Math.floor((avgDurationMs % (1000 * 60 * 60)) / (1000 * 60));
                avgWorkHoursStr = `${h}h ${m}m`;
            }

            const totalCapacityMs = 8 * 8 * 60 * 60 * 1000;
            machineUtilization = ((totalDurationMs / totalCapacityMs) * 100).toFixed(1);
        }

        const richOperatorStats = {};
        if (processedLogs.length > 0) {
            processedLogs.forEach(log => {
                const id = log.operator_id;
                if (!id) return;

                const name = log.operator?.name || `Operator #${id}`;
                const key = id;

                if (!richOperatorStats[key]) {
                    richOperatorStats[key] = {
                        id,
                        name,
                        ok: 0,
                        delay: 0,
                        confirmed: 0
                    };
                }
                const st = log.status?.toUpperCase();
                if (st === "OK") richOperatorStats[key].ok++;
                if (st === "DELAY") richOperatorStats[key].delay++;
                if (log.supervisor_confirmation === "CONFIRMED") richOperatorStats[key].confirmed++;
            });
        }

        let finalOperators = Object.values(richOperatorStats);

        if (sessions) {
            finalOperators = finalOperators.map(op => {
                const opSessions = sessions.filter(s => s.operator_id === op.id);

                const machinesSet = new Set(opSessions.map(s => s.machine_id));
                const machineCount = machinesSet.size;

                let totalExpected = 0;
                const now = new Date().getTime();

                opSessions.forEach(s => {
                    if (!s.started_at) return;
                    const start = new Date(s.started_at).getTime();
                    const end = s.ended_at ? new Date(s.ended_at).getTime() : now;
                    const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
                    totalExpected += durationHours / 2;
                });
                const virtual = Math.round(totalExpected);
                const actual = op.ok + op.delay;
                const none = Math.max(0, virtual - actual);

                const duration = opSessions.reduce((acc, s) => {
                    const start = new Date(s.started_at).getTime();
                    const end = s.ended_at ? new Date(s.ended_at).getTime() : start;
                    return acc + Math.max(0, end - start);
                }, 0);
                const h = Math.floor(duration / (1000 * 60 * 60));
                const m = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

                return { ...op, virtual, actual, none, machineCount, workingTime: `${h}h ${m}m` };
            });
        } else {
            finalOperators = finalOperators.map(op => ({
                ...op,
                virtual: op.ok + op.delay,
                actual: op.ok + op.delay,
                none: 0,
                machineCount: 1,
                workingTime: "—"
            }));
        }

        finalOperators.sort((a, b) => {
            const ratioA = a.virtual > 0 ? a.actual / a.virtual : 0;
            const ratioB = b.virtual > 0 ? b.actual / b.virtual : 0;

            if (ratioB !== ratioA) return ratioB - ratioA;
            if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
            return b.ok - a.ok;
        });

        return {
            avgResponseStr,
            supervisorActivity,
            credibilityScore,
            okRate,
            delayRate,
            noneRate,
            totalComplianceRate,
            totalLogs: logs ? logs.length : 0,
            virtualTotal,
            statusBreakdown: { ok: okCount, delay: delayCount, none: noneCount },
            topOperator: finalOperators[0] ? { ...finalOperators[0], display: `${finalOperators[0].actual} / ${finalOperators[0].virtual}` } : { name: "-", display: "0 / 0" },
            topSupervisor: rankedSupervisors[0] || ["-", 0],
            allOperators: finalOperators,
            sessionMetrics: {
                activeOperators: activeOperatorsCount
            }
        };
    }, [logs, sessions]);

    if (!metrics) {
        return <div style={{ padding: "2rem" }}>{t("status.loading")}</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                <Card
                    title={t("kpi.activeOperators")}
                    value={metrics.sessionMetrics.activeOperators}
                    color="#4ade80"
                    hint={t("kpi.activeOperatorsHint")}
                />
                <Card
                    title={t("kpi.supervisorActivity")}
                    value={`${metrics.supervisorActivity}%`}
                    color="#60a5fa"
                    hint={t("kpi.supervisorActivityHint")}
                />
                <Card
                    title={t("kpi.operatorCredibility")}
                    value={`${metrics.credibilityScore}%`}
                    color="#a78bfa"
                    hint={t("kpi.operatorCredibilityHint")}
                />
                <Card
                    title={t("kpi.complianceOk")}
                    value={`${metrics.okRate}%`}
                    color="#f472b6"
                    hint={t("kpi.complianceOkHint")}
                />
                <Card
                    title={t("kpi.complianceDelay")}
                    value={`${metrics.delayRate}%`}
                    color="#fb923c"
                    hint={t("kpi.complianceDelayHint")}
                />
                <Card
                    title={t("kpi.totalCompliance")}
                    value={`${metrics.totalComplianceRate}%`}
                    color="#38bdf8"
                    hint={t("kpi.totalComplianceHint")}
                />
                <Card
                    title={t("kpi.lowActivity")}
                    value={`${metrics.noneRate}%`}
                    color="#94a3b8"
                    hint={t("kpi.lowActivityHint")}
                />
                <Card
                    title={t("kpi.avgResponse")}
                    value={metrics.avgResponseStr}
                    color="#0ea5e9"
                    hint={t("kpi.avgResponseHint")}
                />

                <div style={styles.wideCard}>
                    <h3>{t("kpi.topPerformers")}</h3>
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1rem" }}>
                        <div>
                            <div style={styles.subLabel}>{t("kpi.topOperator")}</div>
                            <div style={styles.performer}>{metrics.topOperator.name}</div>
                            <div style={styles.subVal}>
                                {metrics.topOperator.display} {t("kpi.changes")}
                            </div>
                        </div>
                        <div style={{ borderLeft: "1px solid #333" }}></div>
                        <div>
                            <div style={styles.subLabel}>{t("kpi.mostActiveSupervisor")}</div>
                            <div style={styles.performer}>{metrics.topSupervisor[0]}</div>
                            <div style={styles.subVal}>{metrics.topSupervisor[1]} {t("kpi.confirmations")}</div>
                        </div>
                    </div>
                </div>

                <div style={styles.wideCard}>
                    <h3>{t("kpi.dailyOverview")}</h3>
                    <p style={{ textAlign: "center", fontSize: "1.1rem", marginTop: "10px" }}>
                        {t("kpi.actualChanges")}: <strong style={{ color: "var(--text-primary)" }}>{metrics.totalLogs}</strong>
                    </p>
                    <div style={{ display: "flex", gap: "20px", marginTop: "10px", justifyContent: "center" }}>
                        <div style={{ color: "#4ade80" }}>{t("kpi.ok")}: {metrics.statusBreakdown.ok}</div>
                        <div style={{ color: "orange" }}>{t("kpi.delay")}: {metrics.statusBreakdown.delay}</div>
                        <div style={{ color: "#94a3b8" }}>{t("kpi.lowActivityNone")} : {metrics.statusBreakdown.none}</div>
                    </div>
                </div>
            </div>


            <h3 style={{ margin: "2rem 0 1rem 1rem", color: "var(--text-secondary)" }}>{t("kpi.operatorBreakdown")}</h3>
            <div style={{ overflowX: "auto", padding: "0 1rem" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>{t("kpi.operatorCol")}</th>
                            <th style={styles.th}>{t("kpi.actualVirtual")}</th>
                            <th style={{ ...styles.th, color: "#4ade80" }}>{t("kpi.okCol")}</th>
                            <th style={{ ...styles.th, color: "#fb923c" }}>{t("kpi.delayCol")}</th>
                            <th style={{ ...styles.th, color: "#94a3b8" }}>{t("kpi.noneCol")}</th>
                            <th style={styles.th}>{t("kpi.confirmedCol")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.allOperators.map((op, idx) => (
                            <tr key={idx} style={styles.tr}>
                                <td style={styles.td}>{op.name}</td>
                                <td style={styles.td}>{op.actual} / {op.virtual}</td>
                                <td style={{ ...styles.td, color: "#4ade80" }}>{op.ok}</td>
                                <td style={{ ...styles.td, color: "#fb923c" }}>{op.delay}</td>
                                <td style={{ ...styles.td, color: "#94a3b8" }}>{op.none}</td>
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
        background: "var(--bg-card)",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "var(--card-shadow)",
        textAlign: "center",
        position: "relative",
        border: "1px solid var(--border-color)",
    },
    header: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        marginBottom: "10px",
    },
    infoIcon: {
        background: "var(--bg-secondary)",
        color: "var(--text-secondary)",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "help",
        border: "1px solid var(--border-color)",
    },
    wideCard: {
        gridColumn: "span 2",
        background: "var(--bg-card)",
        padding: "1.5rem",
        borderRadius: "8px",
        boxShadow: "var(--card-shadow)",
        border: "1px solid var(--border-color)",
    },
    cardTitle: {
        margin: 0,
        color: "var(--text-secondary)",
        fontSize: "0.9rem",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    cardValue: {
        fontSize: "2.5rem",
        fontWeight: "bold",
    },
    subLabel: { color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" },
    performer: { fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-primary)", margin: "5px 0" },
    subVal: { color: "var(--text-secondary)", fontSize: "0.9rem" },
    container: { paddingBottom: "2rem" },
    table: { width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", borderRadius: "8px", overflow: "hidden" },
    th: { padding: "1rem", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" },
    td: { padding: "1rem", borderBottom: "1px solid var(--border-color)", color: "var(--text-primary)" },
    tr: { transition: "background 0.2s" }
};
