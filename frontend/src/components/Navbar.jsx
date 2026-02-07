import React from "react";
import { useTheme } from "../context/ThemeContext";
import {
  ClipboardList,
  LayoutDashboard as Barchart, // Renaming for clarity if needed
  LineChart,
  BarChart3 as StatsIcon,
  Sun,
  Moon,
  Settings as SettingsIcon
} from "lucide-react";

export default function Navbar({ active, onChange }) {
  const { theme, toggleTheme } = useTheme();
  const items = [
    { id: "logs", label: "Logs", icon: ClipboardList },
    { id: "kpi", label: "KPI", icon: Barchart },
    { id: "stats", label: "Statistics", icon: StatsIcon },
    { id: "management", label: "Management", icon: ClipboardList }, // Placeholder icon, maybe use Settings or Users
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        Needle Change Admin Dashboard</div>
      <div style={styles.links}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                ...styles.btn,
                ...(active === item.id ? styles.active : {}),
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
        <button onClick={toggleTheme} style={styles.themeBtn} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    boxShadow: "var(--card-shadow)",
    marginBottom: "2rem",
    borderBottom: "1px solid var(--border-color)",
  },
  logo: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    letterSpacing: "1px",
    color: "var(--accent-color)",
  },
  links: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  btn: {
    padding: "0.6rem 1.2rem",
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid transparent",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  active: {
    background: "var(--bg-primary)",
    color: "var(--accent-color)",
    borderColor: "var(--accent-color)",
  },
  themeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "0.5rem",
    marginLeft: "1rem",
    color: "var(--text-primary)",
  },
};
