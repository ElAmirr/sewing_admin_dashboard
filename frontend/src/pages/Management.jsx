import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, User, Users, Cog, LayoutGrid, Pencil, X, Check } from "lucide-react";

// API Helpers (Ideally move these to api.js)
const API_BASE = "http://localhost:3001/api";

const fetchMetadata = async (type) => {
    const res = await fetch(`${API_BASE}/metadata/${type}`);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
};

const addMetadata = async ({ type, data }) => {
    const res = await fetch(`${API_BASE}/metadata/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add");
    return res.json();
};

const deleteMetadata = async ({ type, id }) => {
    const res = await fetch(`${API_BASE}/metadata/${type}/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");
    return res.json();
};

const updateMetadata = async ({ type, id, data }) => {
    const res = await fetch(`${API_BASE}/metadata/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");
    return res.json();
};

export default function Management() {
    const [activeTab, setActiveTab] = useState("operators");

    const renderContent = () => {
        switch (activeTab) {
            case "operators":
                return <MetadataSection type="operators" title="Operators" icon={User} fields={["operator_id", "name", "badge"]} />;
            case "supervisors":
                return <MetadataSection type="supervisors" title="Supervisors" icon={Users} fields={["supervisor_id", "supervisor_name", "badge"]} />;
            case "machines":
                return <MetadataSection type="machines" title="Machines" icon={Cog} fields={["machine_id", "code"]} />;
            default:
                return null;
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>System Management</h1>
                <p style={styles.subtitle}>Manage operators, supervisors, and machine configurations.</p>
            </header>

            <div style={styles.layout}>
                <aside style={styles.sidebar}>
                    <button style={activeTab === "operators" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("operators")}>
                        <User size={18} /> Operators
                    </button>
                    <button style={activeTab === "supervisors" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("supervisors")}>
                        <Users size={18} /> Supervisors
                    </button>
                    <button style={activeTab === "machines" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("machines")}>
                        <Cog size={18} /> Machines
                    </button>
                </aside>
                <main style={styles.content}>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

function MetadataSection({ type, title, icon: Icon, fields }) {
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

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <div style={styles.sectionHeader}>
                <Icon size={24} style={{ color: "var(--accent-color)" }} />
                <h2>{title} Management</h2>
            </div>

            <div style={styles.card}>
                <h3>Add New {title.slice(0, -1)}</h3>
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
                        <Plus size={16} /> {mutationAdd.isPending ? "Adding..." : "Add Item"}
                    </button>
                </form>
                {mutationAdd.isError && <p style={{ color: "red" }}>Error adding item</p>}
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
                                            <Check size={18} />
                                        </button>
                                        <button type="button" onClick={cancelEdit} style={{ ...styles.btnIcon, color: '#ef4444' }} title="Cancel">
                                            <X size={18} />
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
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Delete ${item[nameKey]}?`)) {
                                                    mutationDelete.mutate({ type, id: item[idKey] });
                                                }
                                            }}
                                            style={{ ...styles.deleteButton }} // Fixed style ref
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
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
        background: "rgba(99, 102, 241, 0.1)", // Light tint of accent
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
    },
    input: {
        flex: 1,
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
        "&:hover": {
            background: "rgba(255, 255, 255, 0.1)",
        }
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
        "&:hover": {
            background: "rgba(255, 255, 255, 0.1)",
        }
    },
    deleteButton: {
        background: "transparent",
        border: "none",
        color: "#ef4444",
        cursor: "pointer",
        padding: "0.5rem",
        borderRadius: "4px",
        transition: "background 0.2s",
        "&:hover": {
            background: "rgba(239, 68, 68, 0.1)",
        },
    },
};
