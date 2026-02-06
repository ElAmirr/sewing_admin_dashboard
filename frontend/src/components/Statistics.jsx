import React, { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
    BarChart,
    Bar,
    Cell,
} from "recharts";
import { format, parseISO, isSameDay } from "date-fns";

export default function Statistics({ logs, sessions }) {
    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const dailyMap = {};

        // Group logs by day
        logs.forEach((log) => {
            if (!log.cycle_start_time) return;

            let dateKey;
            try {
                dateKey = format(parseISO(log.cycle_start_time), "yyyy-MM-dd");
            } catch (e) {
                return;
            }

            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = {
                    date: dateKey,
                    displayDate: format(parseISO(log.cycle_start_time), "MMM d"),
                    ok: 0,
                    delay: 0,
                    reviewed: 0,
                    confirmed: 0,
                    totalCycles: 0,
                    totalSessionMs: 0,
                    activeOperators: new Set(),
                };
            }

            const day = dailyMap[dateKey];
            day.totalCycles++;
            if (log.status === "OK") day.ok++;
            if (log.status === "DELAY") day.delay++;

            if (
                log.supervisor_confirmation === "CONFIRMED" ||
                log.supervisor_confirmation === "NOT_CONFIRMED"
            ) {
                day.reviewed++;
                if (log.supervisor_confirmation === "CONFIRMED") day.confirmed++;
            }
            if (log.operator_id) day.activeOperators.add(log.operator_id);
        });

        // Match sessions by day
        if (sessions) {
            sessions.forEach((session) => {
                if (!session.started_at || !session.ended_at) return;

                let dateKey;
                try {
                    dateKey = format(parseISO(session.started_at), "yyyy-MM-dd");
                } catch (e) {
                    return;
                }

                if (dailyMap[dateKey]) {
                    const start = new Date(session.started_at).getTime();
                    const end = new Date(session.ended_at).getTime();
                    dailyMap[dateKey].totalSessionMs += end - start;
                }
            });
        }

        // Convert to array and calculate final daily metrics
        return Object.values(dailyMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((day) => {
                const total = day.totalCycles || 1;
                const totalReviewed = day.reviewed || 1;

                // Machine Utilization: (Total Session Duration / (8 machines * 8 hour shift)) * 100
                const capacityMs = 8 * 8 * 60 * 60 * 1000;
                const utilization = ((day.totalSessionMs / capacityMs) * 100).toFixed(1);

                // Avg Work Hours per Operator
                const opsCount = day.activeOperators.size || 1;
                const avgWorkHours = (day.totalSessionMs / (1000 * 60 * 60 * opsCount)).toFixed(1);

                return {
                    ...day,
                    okRate: parseFloat(((day.ok / total) * 100).toFixed(1)),
                    delayRate: parseFloat(((day.delay / total) * 100).toFixed(1)),
                    supervisorActivity: parseFloat(((day.reviewed / total) * 100).toFixed(1)),
                    credibilityScore: day.reviewed > 0
                        ? parseFloat(((day.confirmed / day.reviewed) * 100).toFixed(1))
                        : 0,
                    machineUtilization: parseFloat(utilization),
                    avgWorkHours: parseFloat(avgWorkHours),
                };
            });
    }, [logs, sessions]);

    if (!logs || logs.length === 0) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No historical data found for this month.
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Monthly Performance Trends</h2>

            <div style={styles.chartGrid}>
                {/* Chart 1: Operator Compliance (Stacked Area) */}
                <div style={styles.chartCard}>
                    <h3>Operator Compliance (OK vs DELAY)</h3>
                    <p style={styles.chartSub}>Daily count of OK and DELAY cycles</p>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                    itemStyle={{ fontSize: "12px" }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                <Area type="monotone" dataKey="ok" name="OK" stackId="1" stroke="#4ade80" fill="#4ade80" fillOpacity={0.3} />
                                <Area type="monotone" dataKey="delay" name="DELAY" stackId="1" stroke="#f472b6" fill="#f472b6" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Supervisor Activity & Credibility (Line) */}
                <div style={styles.chartCard}>
                    <h3>Supervisor Activity & Credibility (%)</h3>
                    <p style={styles.chartSub}>Compliance rates and review efficiency</p>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis unit="%" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                <Line type="monotone" dataKey="supervisorActivity" name="Sup. Activity" stroke="#60a5fa" strokeWidth={3} dot={{ fill: "#60a5fa" }} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="credibilityScore" name="Credibility" stroke="#a78bfa" strokeWidth={3} dot={{ fill: "#a78bfa" }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 3: Machine Utilization (%) */}
                <div style={styles.chartCard}>
                    <h3>Machine Utilization Rate (%)</h3>
                    <p style={styles.chartSub}>Percentage of capacity used per day</p>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis unit="%" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                />
                                <Bar dataKey="machineUtilization" name="Utilization %" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.machineUtilization > 50 ? "#22c55e" : "#fb923c"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 4: Average Work Time (Hours) */}
                <div style={styles.chartCard}>
                    <h3>Avg Operator Work Time (Hours)</h3>
                    <p style={styles.chartSub}>Average shift duration per operator</p>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis unit="h" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                />
                                <Line type="stepAfter" dataKey="avgWorkHours" name="Avg Hours" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <h3 style={{ margin: "2rem 0 1rem 1rem", color: "var(--text-secondary)" }}>📋 Daily Performance Breakdown</h3>
            <div style={{ overflowX: "auto", paddingBottom: "2rem" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Total Cycles</th>
                            <th style={styles.th}>OK %</th>
                            <th style={styles.th}>Delay %</th>
                            <th style={styles.th}>Utilization %</th>
                            <th style={styles.th}>Avg Work Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((day) => (
                            <tr key={day.date} style={styles.tr}>
                                <td style={styles.td}>{day.date}</td>
                                <td style={styles.td}>{day.totalCycles}</td>
                                <td style={{ ...styles.td, color: "#4ade80" }}>{day.okRate}%</td>
                                <td style={{ ...styles.td, color: "#f472b6" }}>{day.delayRate}%</td>
                                <td style={{ ...styles.td, color: "#fb923c" }}>{day.machineUtilization}%</td>
                                <td style={styles.td}>{day.avgWorkHours}h</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: "1rem",
    },
    title: {
        color: "var(--text-primary)",
        marginBottom: "1.5rem",
        paddingLeft: "0.5rem",
    },
    chartGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        gap: "1.5rem",
    },
    chartCard: {
        background: "var(--bg-card)",
        padding: "1.5rem",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--card-shadow)",
    },
    chartSub: {
        color: "var(--text-secondary)",
        fontSize: "0.85rem",
        marginBottom: "1.5rem",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        background: "var(--bg-card)",
        borderRadius: "8px",
        overflow: "hidden",
    },
    th: {
        padding: "1rem",
        textAlign: "left",
        color: "var(--text-secondary)",
        borderBottom: "1px solid var(--border-color)",
    },
    td: {
        padding: "1rem",
        borderBottom: "1px solid var(--border-color)",
        color: "var(--text-primary)",
    },
    tr: {
        transition: "background 0.2s",
        "&:hover": {
            background: "rgba(255,255,255,0.02)",
        },
    },
};
