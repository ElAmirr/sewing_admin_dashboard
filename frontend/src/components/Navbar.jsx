import React from "react";

export default function Navbar({ active, onChange }) {
  const items = [
    { id: "logs", label: "📋 Logs", icon: "📋" },
    { id: "kpi", label: "📊 KPI", icon: "📊" },
    { id: "stats", label: "📈 Statistics", icon: "📈" },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>Needle Change Admin Dashboard</div>
      <div style={styles.links}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              ...styles.btn,
              ...(active === item.id ? styles.active : {}),
            }}
          >
            {item.label}
          </button>
        ))}
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
    background: "#1a1a1a",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    marginBottom: "2rem",
  },
  logo: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  links: {
    display: "flex",
    gap: "1rem",
  },
  btn: {
    padding: "0.6rem 1.2rem",
    background: "transparent",
    color: "#aaa",
    border: "1px solid transparent",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  active: {
    background: "#333",
    color: "#fff",
    borderColor: "#444",
  },
};
