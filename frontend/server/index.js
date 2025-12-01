import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"], credentials: false }));
app.use(express.json());

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