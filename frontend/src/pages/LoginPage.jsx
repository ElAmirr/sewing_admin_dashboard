import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function LoginPage() {
    const { login } = useAuth();
    const { t, language, toggleLanguage } = useLanguage();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.logoIcon}>🔒</div>
                    <h1 style={styles.title}>{t("login.title")}</h1>
                    <p style={styles.subtitle}>{t("login.subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>{t("login.username")}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t("login.usernamePlaceholder")}
                            style={styles.input}
                            autoFocus
                            required
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.label}>{t("login.password")}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("login.passwordPlaceholder")}
                            style={styles.input}
                            required
                        />
                    </div>

                    {error && (
                        <div style={styles.error}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1,
                        }}
                        disabled={loading}
                    >
                        {loading ? t("login.loggingIn") : t("login.submit")}
                    </button>
                </form>

                <button onClick={toggleLanguage} style={styles.langToggle}>
                    {language === "en" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        padding: "1rem",
    },
    card: {
        background: "rgba(30, 41, 59, 0.85)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: "16px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4), 0 0 80px rgba(99, 102, 241, 0.1)",
    },
    header: {
        textAlign: "center",
        marginBottom: "2rem",
    },
    logoIcon: {
        fontSize: "2.5rem",
        marginBottom: "0.75rem",
    },
    title: {
        fontSize: "1.5rem",
        fontWeight: "700",
        color: "#f1f5f9",
        margin: "0 0 0.5rem 0",
    },
    subtitle: {
        fontSize: "0.9rem",
        color: "#94a3b8",
        margin: 0,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
    },
    label: {
        fontSize: "0.85rem",
        fontWeight: "600",
        color: "#cbd5e1",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    input: {
        padding: "0.85rem 1rem",
        borderRadius: "10px",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        background: "rgba(15, 23, 42, 0.6)",
        color: "#f1f5f9",
        fontSize: "1rem",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
    },
    button: {
        padding: "0.9rem",
        borderRadius: "10px",
        border: "none",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "#fff",
        fontSize: "1rem",
        fontWeight: "700",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.2s",
        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
        marginTop: "0.5rem",
        letterSpacing: "0.5px",
    },
    error: {
        background: "rgba(239, 68, 68, 0.15)",
        border: "1px solid rgba(239, 68, 68, 0.4)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        color: "#fca5a5",
        fontSize: "0.9rem",
        textAlign: "center",
    },
    langToggle: {
        display: "block",
        margin: "1.5rem auto 0",
        background: "transparent",
        border: "none",
        color: "#94a3b8",
        fontSize: "0.85rem",
        cursor: "pointer",
        padding: "0.4rem 0.8rem",
        borderRadius: "6px",
        transition: "color 0.2s",
    },
};
