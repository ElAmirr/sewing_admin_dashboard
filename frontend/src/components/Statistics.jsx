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
    LabelList,
} from "recharts";
import { format, parseISO, isSameDay } from "date-fns";
import { useLanguage } from "../context/LanguageContext";

export default function Statistics({ logs, sessions, shift }) {
    const { t } = useLanguage();

    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const SHIFT_LABEL = { shift1: "S1", shift2: "S2", shift3: "S3", unknown: "?" };
        const SHIFT_FULL = { shift1: "Shift 1 (22-06)", shift2: "Shift 2 (06-14)", shift3: "Shift 3 (14-22)" };

        const getShift = (dateStr) => {
            const h = new Date(dateStr).getHours();
            if (h >= 22 || h < 6) return "shift1";
            if (h >= 6 && h < 14) return "shift2";
            if (h >= 14 && h < 22) return "shift3";
            return "unknown";
        };

        const slotMap = {};

        logs.forEach(log => {
            let dateKey = log.business_date;
            if (!dateKey && log.cycle_start_time) {
                try { dateKey = format(parseISO(log.cycle_start_time), "yyyy-MM-dd"); }
                catch (e) { return; }
            }
            if (!dateKey) return;

            const shiftKey = getShift(log.cycle_start_time || "");
            const key = `${dateKey}_${shiftKey}`;

            if (!slotMap[key]) {
                slotMap[key] = {
                    date: dateKey,
                    shift: shiftKey,
                    displayDate: format(parseISO(dateKey), "MMM d"),
                    label: `${format(parseISO(dateKey), "MMM d")} ${SHIFT_LABEL[shiftKey] || ""}`,
                    shiftFull: SHIFT_FULL[shiftKey] || shiftKey,
                    ok: 0, delay: 0, none: 0, virtual: 0,
                    reviewed: 0, confirmed: 0, totalSessionMs: 0,
                    activeOperators: new Set(),
                    sessionSlots: new Set(),
                };
            }
            const slot = slotMap[key];
            const status = log.status?.toUpperCase();
            if (status === "OK") slot.ok++;
            else if (status === "DELAY") slot.delay++;

            if (log.supervisor_confirmation === "CONFIRMED" || log.supervisor_confirmation === "NOT_CONFIRMED") {
                slot.reviewed++;
                if (log.supervisor_confirmation === "CONFIRMED") slot.confirmed++;
            }
            if (log.operator_id) slot.activeOperators.add(log.operator_id);
        });

        if (sessions) {
            sessions.forEach(session => {
                if (!session.started_at) return;
                const dateKey = session.business_date ||
                    format(parseISO(session.started_at), "yyyy-MM-dd");
                const shiftKey = getShift(session.started_at);
                const key = `${dateKey}_${shiftKey}`;
                if (!slotMap[key]) return;
                const slotKey = `${session.operator_id}_${session.machine_id}`;
                slotMap[key].sessionSlots.add(slotKey);
                const s = new Date(session.started_at).getTime();
                const e = session.ended_at ? new Date(session.ended_at).getTime() : new Date().getTime();
                if (e > s) slotMap[key].totalSessionMs += e - s;
            });
        }

        Object.values(slotMap).forEach(slot => {
            // 1 change per 2 hours
            slot.virtual = Math.round(slot.totalSessionMs / (1000 * 60 * 60 * 2));
            slot.none = Math.max(0, slot.virtual - slot.ok - slot.delay);
        });

        return Object.values(slotMap)
            .sort((a, b) => a.date.localeCompare(b.date) || a.shift.localeCompare(b.shift))
            .map(slot => {
                const total = slot.virtual || (slot.ok + slot.delay) || 1;
                return {
                    ...slot,
                    totalChanges: slot.ok + slot.delay,
                    noneTotal: slot.none,
                    okRate: parseFloat(((slot.ok / total) * 100).toFixed(1)),
                    delayRate: parseFloat(((slot.delay / total) * 100).toFixed(1)),
                    noneRate: parseFloat(((slot.none / total) * 100).toFixed(1)),
                    supervisorActivity: parseFloat(((slot.reviewed / (slot.ok + slot.delay || 1)) * 100).toFixed(1)),
                    credibilityScore: slot.reviewed > 0
                        ? parseFloat(((slot.confirmed / slot.reviewed) * 100).toFixed(1))
                        : 0,
                };
            });
    }, [logs, sessions]);

    if (!logs || logs.length === 0) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                {t("status.noData")}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{t("statistics.monthlyTrends")}</h2>

            <div style={styles.chartGrid}>
                {/* Chart 1: Work Activity */}
                <div style={styles.chartCard}>
                    <h3>{t("statistics.workActivity")}</h3>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    stroke="var(--text-secondary)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                />
                                <YAxis unit="%" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                    formatter={(value, name) => [`${value}%`, name]}
                                    labelFormatter={(label) => {
                                        const item = chartData.find(d => d.label === label);
                                        return item ? `${item.displayDate} — ${item.shiftFull}` : label;
                                    }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                <Bar dataKey="okRate" name={t("statistics.okBar")} stackId="active" fill="#4caf50" radius={[0, 0, 0, 0]}>
                                    <LabelList dataKey="okRate" position="inside" style={{ fill: "#fff", fontSize: 11, fontWeight: "bold" }} formatter={(v) => v >= 8 ? `${v}%` : ""} />
                                </Bar>
                                <Bar dataKey="delayRate" name={t("statistics.delayBar")} stackId="active" fill="#ff9800" radius={[0, 0, 0, 0]}>
                                    <LabelList dataKey="delayRate" position="inside" style={{ fill: "#fff", fontSize: 11, fontWeight: "bold" }} formatter={(v) => v >= 8 ? `${v}%` : ""} />
                                </Bar>
                                <Bar dataKey="noneRate" name={t("statistics.lowActivityBar")} fill="#f44336" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="noneRate" position="top" style={{ fill: "var(--text-primary)", fontSize: 11, fontWeight: "bold" }} formatter={(v) => v > 0 ? `${v}%` : ""} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Supervisor Activity & Credibility */}
                <div style={styles.chartCard}>
                    <h3>{t("statistics.supActivity")}</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    stroke="var(--text-secondary)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                />
                                <YAxis unit="%" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                    formatter={(value, name) => [`${value}%`, name]}
                                    labelFormatter={(label) => {
                                        const item = chartData.find(d => d.label === label);
                                        return item ? `${item.displayDate} — ${item.shiftFull}` : label;
                                    }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                <Bar dataKey="supervisorActivity" name={t("statistics.supActivityBar")} fill="#4caf50" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="supervisorActivity" position="top" style={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: "bold" }} formatter={(v) => `${v}%`} />
                                </Bar>
                                <Bar dataKey="credibilityScore" name={t("statistics.credibilityBar")} fill="#ffc107" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="credibilityScore" position="top" style={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: "bold" }} formatter={(v) => `${v}%`} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <h3 style={{ margin: "2rem 0 1rem 1rem", color: "var(--text-secondary)" }}>{t("statistics.dailyBreakdown")}</h3>
            <div style={{ overflowX: "auto", paddingBottom: "2rem" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>{t("statistics.date")}</th>
                            <th style={styles.th}>{t("statistics.changesActualVirtual")}</th>
                            <th style={styles.th}>{t("statistics.okPercent")}</th>
                            <th style={styles.th}>{t("statistics.delayPercent")}</th>
                            <th style={styles.th}>{t("statistics.nonePercent")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((day) => (
                            <tr key={day.date} style={styles.tr}>
                                <td style={styles.td}>{day.date}</td>
                                <td style={styles.td}>{day.totalChanges} / {day.virtual}</td>
                                <td style={{ ...styles.td, color: "#4ade80" }}>{day.okRate}%</td>
                                <td style={{ ...styles.td, color: "#f472b6" }}>{day.delayRate}%</td>
                                <td style={{ ...styles.td, color: "#94a3b8" }}>{day.noneRate}%</td>
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
