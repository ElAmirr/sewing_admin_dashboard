import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "../config/config.js";

const USERS_FILE = path.join(DATA_DIR, "users.json");

async function readUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.warn(`Users file not found at ${USERS_FILE}`);
            return [];
        }
        const data = await fsPromises.readFile(USERS_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading users file:", err);
        return [];
    }
}

async function writeUsers(users) {
    await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// POST /api/auth/login
export async function login(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const users = await readUsers();
        const user = users.find(
            (u) => u.username === username && u.password === password
        );

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Return user info without password
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

// GET /api/auth/users
export async function getUsers(req, res) {
    try {
        const users = await readUsers();
        // Return users without passwords
        const safeUsers = users.map(({ password, ...rest }) => rest);
        res.json(safeUsers);
    } catch (err) {
        console.error("Get users error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

// POST /api/auth/users
export async function addUser(req, res) {
    try {
        const { username, password, name } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ error: "username, password, and name are required" });
        }

        const users = await readUsers();

        // Check for duplicate username
        if (users.find((u) => u.username === username)) {
            return res.status(409).json({ error: "Username already exists" });
        }

        const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
        const newUser = {
            id: newId,
            username,
            password,
            role: "admin", // New users are always level 1 admin
            name,
        };

        users.push(newUser);
        await writeUsers(users);

        const { password: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (err) {
        console.error("Add user error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

// DELETE /api/auth/users/:id
export async function deleteUser(req, res) {
    try {
        const id = parseInt(req.params.id);
        const users = await readUsers();

        const user = users.find((u) => u.id === id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Prevent deleting super admins
        if (user.role === "super_admin") {
            return res.status(403).json({ error: "Cannot delete a super admin" });
        }

        const filtered = users.filter((u) => u.id !== id);
        await writeUsers(filtered);

        res.json({ message: "User deleted" });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
