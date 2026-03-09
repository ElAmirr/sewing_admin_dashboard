import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
    OperatorIcon,
    SupervisorIcon,
    MachineIcon,
    PlusIcon,
    EditIcon,
    DeleteIcon,
    CheckIcon,
    CancelIcon,
} from "../components/Icons";
import { Shield } from "lucide-react";
import { api } from "../api/api";

// API Helpers
const fetchMetadata = async (type) => {
    const res = await api.get(`/metadata/${type}`);
    return res.data;
};

const addMetadata = async ({ type, data }) => {
    const res = await api.post(`/metadata/${type}`, data);
    return res.data;
};

const deleteMetadata = async ({ type, id }) => {
    const res = await api.delete(`/metadata/${type}/${id}`);
    return res.data;
};

const updateMetadata = async ({ type, id, data }) => {
    const res = await api.put(`/metadata/${type}/${id}`, data);
    return res.data;
};

// Auth API helpers
const fetchUsers = async () => {
    const res = await api.get("/auth/users");
    return res.data;
};

const addAuthUser = async (data) => {
    try {
        const res = await api.post("/auth/users", data);
        return res.data;
    } catch (err) {
        throw new Error(err.response?.data?.error || "Failed to add user");
    }
};

const deleteAuthUser = async (id) => {
    try {
        const res = await api.delete(`/auth/users/${id}`);
        return res.data;
    } catch (err) {
        throw new Error(err.response?.data?.error || "Failed to delete user");
    }
};

export default function Management() {
    const { t } = useLanguage();
    const { isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState("operators");

    const renderContent = () => {
        switch (activeTab) {
            case "operators":
                return <MetadataSection type="operators" title={t("management.operators")} icon={OperatorIcon} fields={["operator_id", "name", "badge"]} />;
            case "supervisors":
                return <MetadataSection type="supervisors" title={t("management.supervisors")} icon={SupervisorIcon} fields={["supervisor_id", "supervisor_name", "badge"]} />;
            case "machines":
                return <MetadataSection type="machines" title={t("management.machines")} icon={MachineIcon} fields={["machine_id", "code"]} />;
            case "admins":
                return <AdminSection />;
            default:
                return null;
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>{t("management.title")}</h1>
                <p style={styles.subtitle}>{t("management.subtitle")}</p>
            </header>

            <div style={styles.layout}>
                <aside style={styles.sidebar}>
                    <button style={activeTab === "operators" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("operators")}>
                        <OperatorIcon size={18} /> {t("management.operators")}
                    </button>
                    <button style={activeTab === "supervisors" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("supervisors")}>
                        <SupervisorIcon size={18} /> {t("management.supervisors")}
                    </button>
                    <button style={activeTab === "machines" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("machines")}>
                        <MachineIcon size={18} /> {t("management.machines")}
                    </button>
                    {isSuperAdmin && (
                        <button style={activeTab === "admins" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("admins")}>
                            <Shield size={18} /> {t("management.admins")}
                        </button>
                    )}
                </aside>
                <main style={styles.content}>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

/* =====================
   ADMIN SECTION
===================== */

function AdminSection() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["auth-users"],
        queryFn: fetchUsers,
    });

    const mutationAdd = useMutation({
        mutationFn: addAuthUser,
        onSuccess: () => {
            queryClient.invalidateQueries(["auth-users"]);
            setFormData({});
        },
        onError: (err) => alert(err.message),
    });

    const mutationDelete = useMutation({
        mutationFn: deleteAuthUser,
        onSuccess: () => queryClient.invalidateQueries(["auth-users"]),
        onError: (err) => alert(err.message),
    });

    const [formData, setFormData] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();
        mutationAdd.mutate(formData);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (isLoading) return <div>{t("management.loading")}</div>;

    return (
        <div>
            <div style={styles.sectionHeader}>
                <Shield size={24} style={{ color: "var(--accent-color)" }} />
                <h2>{t("management.admins")} {t("management.management")}</h2>
            </div>

            <div style={styles.card}>
                <h3>{t("management.addNew")} {t("login.admin")}</h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        name="name"
                        placeholder={t("management.adminName")}
                        value={formData.name || ""}
                        onChange={handleChange}
                        style={styles.input}
                        required
                    />
                    <input
                        name="username"
                        placeholder={t("login.username")}
                        value={formData.username || ""}
                        onChange={handleChange}
                        style={styles.input}
                        required
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder={t("login.password")}
                        value={formData.password || ""}
                        onChange={handleChange}
                        style={styles.input}
                        required
                    />
                    <button type="submit" style={styles.addButton} disabled={mutationAdd.isPending}>
                        <PlusIcon size={16} /> {mutationAdd.isPending ? t("management.adding") : t("management.addItem")}
                    </button>
                </form>
            </div>

            <div style={styles.grid}>
                {users.map((user) => (
                    <div key={user.id} style={styles.itemCard}>
                        <div>
                            <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>@{user.username}</div>
                            <div style={{
                                fontSize: "0.7rem",
                                color: user.role === "super_admin" ? "#a78bfa" : "#60a5fa",
                                textTransform: "uppercase",
                                fontWeight: "600",
                                marginTop: "4px",
                                letterSpacing: "0.5px",
                            }}>
                                {user.role === "super_admin" ? t("login.superAdmin") : t("login.admin")}
                            </div>
                        </div>
                        {user.role !== "super_admin" && (
                            <button
                                onClick={() => {
                                    if (window.confirm(`${t("management.deleteConfirm")} ${user.name}?`)) {
                                        mutationDelete.mutate(user.id);
                                    }
                                }}
                                style={styles.deleteButton}
                                title="Delete"
                            >
                                <DeleteIcon size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* =====================
   METADATA SECTION
===================== */

function MetadataSection({ type, title, icon: Icon, fields }) {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const { data: items = [], isLoading } = useQuery({
        queryKey: [type],
        queryFn: () => fetchMetadata(type),
    });

    const mutationAdd = useMutation({
        mutationFn: addMetadata,
        onSuccess: () => {
            queryClient.invalidateQueries([type]);
            setFormData({});
        },
    });

    const mutationDelete = useMutation({
        mutationFn: deleteMetadata,
        onSuccess: () => queryClient.invalidateQueries([type]),
    });

    const mutationUpdate = useMutation({
        mutationFn: updateMetadata,
        onSuccess: () => {
            queryClient.invalidateQueries([type]);
            setEditingId(null);
        },
    });

    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();
        mutationAdd.mutate({ type, data: formData });
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        mutationUpdate.mutate({ type, id: editingId, data: editFormData });
    };

    const startEdit = (item) => {
        const idKey = type === 'machines' ? 'machine_id' : type === 'supervisors' ? 'supervisor_id' : 'operator_id';
        setEditingId(item[idKey]);
        setEditFormData(item);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    if (isLoading) return <div>{t("management.loading")}</div>;

    return (
        <div>
            <div style={styles.sectionHeader}>
                <Icon size={24} style={{ color: "var(--accent-color)" }} />
                <h2>{title} {t("management.management")}</h2>
            </div>

            <div style={styles.card}>
                <h3>{t("management.addNew")} {title.slice(0, -1)}</h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                    {fields.map((field) => (
                        <input
                            key={field}
                            name={field}
                            placeholder={field.replace("_", " ").toUpperCase()}
                            value={formData[field] || ""}
                            onChange={handleChange}
                            style={styles.input}
                            required
                        />
                    ))}
                    <button type="submit" style={styles.addButton} disabled={mutationAdd.isPending}>
                        <PlusIcon size={16} /> {mutationAdd.isPending ? t("management.adding") : t("management.addItem")}
                    </button>
                </form>
                {mutationAdd.isError && <p style={{ color: "red" }}>{t("management.errorAdding")}</p>}
            </div>

            <div style={styles.grid}>
                {items.map((item) => {
                    const idKey = type === 'machines' ? 'machine_id' : type === 'supervisors' ? 'supervisor_id' : 'operator_id';
                    const nameKey = type === 'machines' ? 'code' : type === 'supervisors' ? 'supervisor_name' : 'name';
                    const isEditing = editingId === item[idKey];

                    return (
                        <div key={item[idKey]} style={styles.itemCard}>
                            {isEditing ? (
                                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                    {fields.filter(f => f !== idKey).map(field => (
                                        <input
                                            key={field}
                                            name={field}
                                            value={editFormData[field] || ""}
                                            onChange={handleEditChange}
                                            style={styles.input}
                                            required
                                        />
                                    ))}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button type="submit" style={{ ...styles.btnIcon, color: '#22c55e' }} title="Save">
                                            <CheckIcon size={18} />
                                        </button>
                                        <button type="button" onClick={cancelEdit} style={{ ...styles.btnIcon, color: '#ef4444' }} title="Cancel">
                                            <CancelIcon size={18} />
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div>
                                        <strong style={{ color: "var(--text-primary)" }}>{item[nameKey]}</strong>
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ID: {item[idKey]}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => startEdit(item)}
                                            style={styles.actionButton}
                                            title="Edit"
                                        >
                                            <EditIcon size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`${t("management.deleteConfirm")} ${item[nameKey]}?`)) {
                                                    mutationDelete.mutate({ type, id: item[idKey] });
                                                }
                                            }}
                                            style={{ ...styles.deleteButton }}
                                            title="Delete"
                                        >
                                            <DeleteIcon size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
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
        color: "var(--text-primary)",
        marginBottom: "0.5rem",
    },
    subtitle: {
        color: "var(--text-secondary)",
    },
    layout: {
        display: "flex",
        gap: "2rem",
        alignItems: "flex-start",
    },
    sidebar: {
        width: "250px",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    },
    content: {
        flex: 1,
    },
    tab: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "1rem",
        width: "100%",
        border: "none",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "1rem",
        transition: "all 0.2s",
        textAlign: "left",
    },
    tabActive: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "1rem",
        width: "100%",
        border: "1px solid var(--accent-color)",
        background: "rgba(99, 102, 241, 0.1)",
        color: "var(--accent-color)",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "1rem",
        fontWeight: "bold",
        textAlign: "left",
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1.5rem",
        color: "var(--text-primary)",
    },
    card: {
        background: "var(--bg-card)",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "2rem",
        border: "1px solid var(--border-color)",
    },
    form: {
        display: "flex",
        gap: "1rem",
        marginTop: "1rem",
        flexWrap: "wrap",
    },
    input: {
        flex: 1,
        minWidth: "150px",
        padding: "0.8rem",
        borderRadius: "6px",
        border: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
    },
    addButton: {
        padding: "0.8rem 1.5rem",
        background: "var(--accent-color)",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontWeight: "600",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "1rem",
    },
    itemCard: {
        background: "var(--bg-card)",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        minHeight: "80px",
    },
    actionButton: {
        background: "transparent",
        border: "none",
        color: "var(--text-secondary)",
        cursor: "pointer",
        padding: "0.5rem",
        borderRadius: "4px",
        transition: "background 0.2s",
    },
    btnIcon: {
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "0.4rem",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    deleteButton: {
        background: "transparent",
        border: "none",
        color: "#ef4444",
        cursor: "pointer",
        padding: "0.5rem",
        borderRadius: "4px",
        transition: "background 0.2s",
    },
};
