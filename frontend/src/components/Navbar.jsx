import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  LogsIcon,
  KpiIcon,
  StatsIcon,
  ManagementIcon,
  SunIcon,
  MoonIcon,
  LanguagesIcon,
} from "./Icons";
import { LogOut } from "lucide-react";

export default function Navbar({ active, onChange }) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout, isSuperAdmin } = useAuth();

  const allItems = [
    { id: "logs", label: t("navbar.logs"), icon: LogsIcon, superOnly: true },
    { id: "kpi", label: t("navbar.kpi"), icon: KpiIcon, superOnly: false },
    { id: "stats", label: t("navbar.statistics"), icon: StatsIcon, superOnly: false },
    { id: "management", label: t("navbar.management"), icon: ManagementIcon, superOnly: true },
  ];

  // Filter tabs based on role
  const items = allItems.filter(item => isSuperAdmin || !item.superOnly);

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        {t("navbar.title")}
      </div>
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
        <button onClick={toggleLanguage} style={styles.langBtn} title="Toggle Language">
          <LanguagesIcon size={18} />
          <span style={{ fontSize: "0.8rem", fontWeight: "600" }}>{language.toUpperCase()}</span>
        </button>
        <button onClick={toggleTheme} style={styles.themeBtn} title="Toggle Theme">
          {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </button>
        <div style={styles.userSection}>
          <span style={styles.userName}>{user?.name}</span>
          <span style={styles.userRole}>{isSuperAdmin ? t("login.superAdmin") : t("login.admin")}</span>
        </div>
        <button onClick={logout} style={styles.logoutBtn} title={t("login.logout")}>
          <LogOut size={18} />
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
  langBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "transparent",
    border: "1px solid var(--border-color)",
    borderRadius: "6px",
    cursor: "pointer",
    padding: "0.4rem 0.8rem",
    color: "var(--text-primary)",
    transition: "all 0.2s ease",
  },
  themeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "0.5rem",
    color: "var(--text-primary)",
  },
  userSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    marginLeft: "0.5rem",
    lineHeight: "1.2",
  },
  userName: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  userRole: {
    fontSize: "0.7rem",
    color: "var(--accent-color)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "6px",
    cursor: "pointer",
    padding: "0.5rem",
    color: "#ef4444",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
  },
};
