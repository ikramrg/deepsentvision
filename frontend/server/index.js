import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"], credentials: false }));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use((err, req, res, next) => {
  if (err && (err.status === 413 || err.statusCode === 413 || err.type === "entity.too.large")) {
    return res.status(413).json({ error: "payload_too_large" });
  }
  next(err);
});

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "deepvision";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

let pool;

async function ensureDatabase() {
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();
  pool = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, connectionLimit: 10 });
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY username_idx (username)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    custom_title TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY user_idx (user_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    images_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY chat_idx (chat_id)
  )`);
  try { await pool.query("ALTER TABLE chat_messages MODIFY images_json LONGTEXT"); } catch {}
  const [rows] = await pool.query("SELECT id FROM users WHERE username=?", ["admin"]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pool.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", ["admin", hash]);
  }
  const emailUser = "user@gmail.com";
  const emailPassHash = await bcrypt.hash("123456!MS", 10);
  await pool.query("INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)", [emailUser, emailPassHash]);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "unauthorized" });
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "missing_credentials" });
    const [rows] = await pool.query("SELECT id, username, password_hash FROM users WHERE username=?", [username]);
    if (rows.length === 0) return res.status(401).json({ error: "invalid_credentials" });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });
    const token = signToken({ sub: user.id, username: user.username });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "missing_credentials" });
    const [rows] = await pool.query("SELECT id FROM users WHERE username=?", [username]);
    if (rows.length > 0) return res.status(409).json({ error: "user_exists" });
    const hash = await bcrypt.hash(password, 10);
    const [insert] = await pool.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash]);
    const token = signToken({ sub: insert.insertId, username });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/auth/forgot", async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "missing_username" });
    const [rows] = await pool.query("SELECT id FROM users WHERE username=?", [username]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await pool.query("INSERT INTO password_resets (username, token) VALUES (?, ?)", [username, token]);
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/auth/reset", async (req, res) => {
  try {
    const { username, token, password } = req.body || {};
    if (!username || !token || !password) return res.status(400).json({ error: "missing_fields" });
    const [rows] = await pool.query("SELECT id FROM password_resets WHERE username=? AND token=?", [username, token]);
    if (rows.length === 0) return res.status(400).json({ error: "invalid_token" });
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash=? WHERE username=?", [hash, username]);
    await pool.query("DELETE FROM password_resets WHERE username=?", [username]);
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "unauthorized" });
    const payload = jwt.verify(parts[1], JWT_SECRET);
    const [rows] = await pool.query("SELECT id, username, created_at FROM users WHERE id=?", [payload.sub]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

ensureDatabase().then(() => {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database", err);
  process.exit(1);
});

app.get("/api/chats", auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, title, custom_title, created_at, updated_at FROM chats WHERE user_id=? ORDER BY updated_at DESC", [req.user.sub]);
    const chats = rows.map(r => ({ id: r.id.toString(), title: r.title, customTitle: !!r.custom_title, createdAt: r.created_at, updatedAt: r.updated_at, messages: [] }));
    res.json({ chats });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/chats", auth, async (req, res) => {
  try {
    const title = req.body?.title || "New Chat";
    const [ins] = await pool.query("INSERT INTO chats (user_id, title, custom_title) VALUES (?, ?, 0)", [req.user.sub, title]);
    const chat = { id: ins.insertId.toString(), title, customTitle: false };
    res.json({ chat });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/chats/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT id, title, custom_title, created_at, updated_at FROM chats WHERE id=? AND user_id=?", [id, req.user.sub]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    const chatRow = rows[0];
    const [msgs] = await pool.query("SELECT id, role, content, images_json, created_at FROM chat_messages WHERE chat_id=? ORDER BY id ASC", [id]);
    const messages = msgs.map(m => ({ id: m.id.toString(), role: m.role, content: m.content || "", images: m.images_json ? JSON.parse(m.images_json) : [], createdAt: m.created_at }));
    res.json({ chat: { id: chatRow.id.toString(), title: chatRow.title, customTitle: !!chatRow.custom_title, createdAt: chatRow.created_at, updatedAt: chatRow.updated_at, messages } });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/chats/:id/messages", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT id FROM chats WHERE id=? AND user_id=?", [id, req.user.sub]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    const role = req.body?.role || "user";
    const content = req.body?.content || "";
    const images = Array.isArray(req.body?.images) ? req.body.images : [];
    const [ins] = await pool.query("INSERT INTO chat_messages (chat_id, role, content, images_json) VALUES (?, ?, ?, ?)", [id, role, content, images.length ? JSON.stringify(images) : null]);
    await pool.query("UPDATE chats SET updated_at=NOW() WHERE id=?", [id]);
    res.json({ message: { id: ins.insertId.toString(), role, content, images } });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.patch("/api/chats/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const title = req.body?.title;
    if (!title || !title.trim()) return res.status(400).json({ error: "missing_title" });
    const [rows] = await pool.query("SELECT id FROM chats WHERE id=? AND user_id=?", [id, req.user.sub]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    await pool.query("UPDATE chats SET title=?, custom_title=1, updated_at=NOW() WHERE id=?", [title.trim(), id]);
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.delete("/api/chats/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT id FROM chats WHERE id=? AND user_id=?", [id, req.user.sub]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    await pool.query("DELETE FROM chat_messages WHERE chat_id=?", [id]);
    await pool.query("DELETE FROM chats WHERE id=?", [id]);
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/chats/:id/duplicate", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT id, title FROM chats WHERE id=? AND user_id=?", [id, req.user.sub]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    const title = rows[0].title + " (Copy)";
    const [ins] = await pool.query("INSERT INTO chats (user_id, title, custom_title) VALUES (?, ?, 1)", [req.user.sub, title]);
    const newId = ins.insertId;
    const [msgs] = await pool.query("SELECT role, content, images_json FROM chat_messages WHERE chat_id=? ORDER BY id ASC", [id]);
    for (const m of msgs) {
      await pool.query("INSERT INTO chat_messages (chat_id, role, content, images_json) VALUES (?, ?, ?, ?)", [newId, m.role, m.content, m.images_json]);
    }
    res.json({ chat: { id: newId.toString(), title } });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.patch("/api/messages/:id", auth, async (req, res) => {
  try {
    const mid = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT chat_id FROM chat_messages WHERE id=?", [mid]);
    if (rows.length === 0) return res.status(404).json({ error: "not_found" });
    const chatId = rows[0].chat_id;
    const [owns] = await pool.query("SELECT id FROM chats WHERE id=? AND user_id=?", [chatId, req.user.sub]);
    if (owns.length === 0) return res.status(403).json({ error: "forbidden" });
    const content = req.body?.content ?? null;
    const images = Array.isArray(req.body?.images) ? req.body.images : null;
    await pool.query("UPDATE chat_messages SET content=?, images_json=? WHERE id=?", [content, images ? JSON.stringify(images) : null, mid]);
    await pool.query("UPDATE chats SET updated_at=NOW() WHERE id=?", [chatId]);
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});
