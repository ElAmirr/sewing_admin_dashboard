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
import { format, parseISO, isSameDay, addDays } from "date-fns";
import { useLanguage } from "../context/LanguageContext";

export default function Statistics({ logs, sessions, shift, date, daysRange = 1 }) {
    const { t } = useLanguage();

    const fullData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const SHIFT_LABEL = { shift1: "S1", shift2: "S2", shift3: "S3", unknown: "?" };
        const SHIFT_FULL = { shift1: "Shift 1 (22-06)", shift2: "Shift 2 (06-14)", shift3: "Shift 3 (14-22)" };

        const getShift = (dateStr) => {
            if (!dateStr) return "unknown";
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
        });

        if (sessions) {
            sessions.forEach(session => {
                if (!session.started_at) return;
                const dateKey = session.business_date || format(parseISO(session.started_at), "yyyy-MM-dd");
                const shiftKey = getShift(session.started_at);
                const key = `${dateKey}_${shiftKey}`;
                if (!slotMap[key]) return;

                const s = new Date(session.started_at).getTime();
                const e = session.ended_at ? new Date(session.ended_at).getTime() : new Date().getTime();
                if (e > s) slotMap[key].totalSessionMs += e - s;
            });
        }

        Object.values(slotMap).forEach(slot => {
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

    const dailyData = useMemo(() => {
        if (!date) return [];

        const selectedDates = [];
        for (let i = 0; i < daysRange; i++) {
            selectedDates.push(format(addDays(parseISO(date), i), "yyyy-MM-dd"));
        }

        const shifts = ["shift1", "shift2", "shift3"];
        const SHIFT_LABEL = { shift1: "S1", shift2: "S2", shift3: "S3" };
        const SHIFT_FULL = { shift1: "Shift 1", shift2: "Shift 2", shift3: "Shift 3" };

        const result = [];
        selectedDates.forEach(d => {
            const filteredForDay = fullData.filter(item => item.date === d);
            shifts.forEach(s => {
                const found = filteredForDay.find(f => f.shift === s);
                if (found) {
                    result.push({
                        ...found,
                        label: daysRange > 1 ? `${format(parseISO(d), "dd/MM")} ${SHIFT_LABEL[s]}` : SHIFT_LABEL[s]
                    });
                } else {
                    result.push({
                        label: daysRange > 1 ? `${format(parseISO(d), "dd/MM")} ${SHIFT_LABEL[s]}` : SHIFT_LABEL[s],
                        shiftFull: SHIFT_FULL[s],
                        date: d,
                        okRate: 0, delayRate: 0, noneRate: 0,
                        supervisorActivity: 0, credibilityScore: 0
                    });
                }
            });
        });
        return result;
    }, [fullData, date, daysRange]);

    if (!logs || logs.length === 0) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                {t("status.noData")}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.headerRow}>
                <h2 style={styles.title}>{t("statistics.performanceOverview")}</h2>
                <div style={styles.rangeIndicator}>
                    {daysRange > 1 ? `Showing ${daysRange} days starting from ${date}` : `Focus: ${date}`}
                </div>
            </div>

            <div style={styles.chartGrid}>
                {/* Chart 1: Daily Work Activity */}
                <div style={styles.chartCard}>
                    <div style={styles.cardHeader}>
                        <h3>{t("statistics.workActivity")}</h3>
                        <span style={styles.dateLabel}>{daysRange === 1 ? format(parseISO(date), "MMMM d") : `${daysRange} Days Analysis`}</span>
                    </div>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData} barCategoryGap={daysRange > 1 ? "15%" : "25%"}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis unit="%" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                    formatter={(value, name) => [`${value}%`, name]}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                <Bar dataKey="okRate" name={t("statistics.okBar")} stackId="a" fill="#4caf50" />
                                <Bar dataKey="delayRate" name={t("statistics.delayBar")} stackId="a" fill="#ff9800" />
                                <Bar dataKey="noneRate" name={t("statistics.lowActivityBar")} fill="#f44336" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Daily Supervisor Metrics */}
                <div style={styles.chartCard}>
                    <div style={styles.cardHeader}>
                        <h3>{t("statistics.supActivity")}</h3>
                        <span style={styles.dateLabel}>{daysRange === 1 ? format(parseISO(date), "MMMM d") : `${daysRange} Days Analysis`}</span>
                    </div>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData} barCategoryGap={daysRange > 1 ? "15%" : "25%"}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis unit="%" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px" }}
                                    formatter={(value, name) => [`${value}%`, name]}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                                <Bar dataKey="supervisorActivity" name={t("statistics.supActivityBar")} fill="#4caf50" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="credibilityScore" name={t("statistics.credibilityBar")} fill="#ffc107" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Chart 3: Full-Width Monthly Work Trends */}
            <div style={{ ...styles.chartCard, marginTop: "1.5rem" }}>
                <div style={styles.cardHeader}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <h3>{t("statistics.monthlyWorkTrends")}</h3>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            {t("statistics.monthlyWorkTrendsDescription")}
                        </p>
                    </div>
                    <span style={styles.dateLabel}>
                        {(fullData[0]?.date || date) ? format(parseISO(fullData[0]?.date || date), "MMM yyyy") : "---"}
                    </span>
                </div>
                <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={fullData}>
                            <defs>
                                <linearGradient id="colorOk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis unit="%" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }}
                                formatter={(value, name) => [`${value}%`, name]}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />

                            <Area type="monotone" dataKey="okRate" name={t("statistics.okBar")} stroke="#4caf50" fillOpacity={1} fill="url(#colorOk)" strokeWidth={3} />
                            <Line type="monotone" dataKey="delayRate" name={t("statistics.delayBar")} stroke="#ff9800" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="noneRate" name={t("statistics.lowActivityBar")} stroke="#f44336" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 4: Full-Width Monthly Supervisor Trends */}
            <div style={{ ...styles.chartCard, marginTop: "1.5rem" }}>
                <div style={styles.cardHeader}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <h3>{t("statistics.monthlySupervisorTrends")}</h3>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            {t("statistics.monthlySupervisorTrendsDescription")}
                        </p>
                    </div>
                    <span style={styles.dateLabel}>
                        {(fullData[0]?.date || date) ? format(parseISO(fullData[0]?.date || date), "MMM yyyy") : "---"}
                    </span>
                </div>
                <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fullData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis unit="%" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px" }}
                                formatter={(value, name) => [`${value}%`, name]}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />

                            <Line type="monotone" dataKey="supervisorActivity" name={t("statistics.supActivityBar")} stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="credibilityScore" name={t("statistics.credibilityBar")} stroke="#9c27b0" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <h3 style={{ margin: "2.5rem 0 1.2rem 0.5rem", color: "var(--text-primary)" }}>{t("statistics.dailyBreakdown")}</h3>
            <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>{t("statistics.date")}</th>
                            <th style={styles.th}>Shift</th>
                            <th style={styles.th}>{t("statistics.changesActualVirtual")}</th>
                            <th style={styles.th}>{t("statistics.okPercent")}</th>
                            <th style={styles.th}>{t("statistics.delayPercent")}</th>
                            <th style={styles.th}>{t("statistics.nonePercent")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fullData.map((day) => (
                            <tr key={`${day.date}_${day.shift}`} style={styles.tr}>
                                <td style={styles.td}>{day.date}</td>
                                <td style={styles.td}>{day.shiftFull}</td>
                                <td style={styles.td}>{day.totalChanges} / {day.virtual}</td>
                                <td style={{ ...styles.td, color: "#4ade80", fontWeight: "600" }}>{day.okRate}%</td>
                                <td style={{ ...styles.td, color: "#fb923c", fontWeight: "600" }}>{day.delayRate}%</td>
                                <td style={{ ...styles.td, color: "#f87171", fontWeight: "600" }}>{day.noneRate}%</td>
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
        padding: "1.5rem",
        maxWidth: "1600px",
        margin: "0 auto",
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
    },
    rangeIndicator: {
        padding: "6px 14px",
        borderRadius: "8px",
        background: "var(--bg-secondary)",
        color: "var(--text-secondary)",
        fontSize: "0.9rem",
        border: "1px solid var(--border-color)",
        fontWeight: "500",
    },
    title: {
        color: "var(--text-primary)",
        margin: 0,
        fontSize: "1.5rem",
        fontWeight: "700",
    },
    chartGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(48%, 1fr))",
        gap: "1.5rem",
    },
    chartCard: {
        background: "var(--bg-card)",
        padding: "1.5rem",
        borderRadius: "16px",
        border: "1px solid var(--border-color)",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1.5rem",
    },
    dateLabel: {
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        padding: "4px 10px",
        background: "var(--bg-secondary)",
        borderRadius: "20px",
        border: "1px solid var(--border-color)",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        background: "var(--bg-card)",
    },
    th: {
        padding: "1.2rem 1rem",
        textAlign: "left",
        color: "var(--text-secondary)",
        borderBottom: "2px solid var(--border-color)",
        fontSize: "0.85rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
    td: {
        padding: "1.2rem 1rem",
        borderBottom: "1px solid var(--border-color)",
        color: "var(--text-primary)",
        fontSize: "0.95rem",
    },
    tr: {
        transition: "background 0.2s",
        "&:hover": {
            backgroundColor: "rgba(255,255,255,0.02)",
        },
    },
};
