import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "../../data/ranklens.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  migrateSchema(_db);
  seedAdmin(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro','enterprise')),
      plan_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','refunded')),
      admin_approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','expired','cancelled')),
      payment_id TEXT REFERENCES payments(id),
      started_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      domain TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      verification_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      site_id TEXT REFERENCES sites(id),
      url TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
      response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      domain TEXT,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      project_id INTEGER REFERENCES projects(id),
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'website',
      status TEXT NOT NULL DEFAULT 'completed',
      seo_score INTEGER DEFAULT 0,
      issue_count INTEGER DEFAULT 0,
      result TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function migrateSchema(db: Database.Database) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT UNIQUE");
  } catch {
    // Column already exists
  }
}

function seedAdmin(db: Database.Database) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("aryanhooda3522@gmail.com");
  if (existing) return;
  const hash = bcrypt.hashSync("Aryan@root", 10);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, plan) VALUES (?, ?, ?, ?, 'admin', 'enterprise')"
  ).run(uuid(), "aryanhooda3522@gmail.com", hash, "Admin");
}

export function createUser(email: string, password: string, name: string, username?: string) {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const id = uuid();
  db.prepare(
    "INSERT INTO users (id, email, username, password_hash, name) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email, username || null, hash, name);
  return db.prepare("SELECT id, email, username, name, role, plan, created_at FROM users WHERE id = ?").get(id) as any;
}

export function getUserByEmail(email: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
}

export function getUserByUsername(username: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
}

export function getUserByEmailOrUsername(login: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(login, login) as any;
}

export function getUserById(id: string) {
  const db = getDb();
  return db.prepare("SELECT id, email, username, name, role, plan, plan_expires_at, created_at FROM users WHERE id = ?").get(id) as any;
}

export function updateUserProfile(userId: string, data: { name?: string; username?: string }) {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.username !== undefined) { fields.push("username = ?"); values.push(data.username); }
  if (fields.length === 0) return getUserById(userId);
  values.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getUserById(userId);
}

export function updateUserPlan(userId: string, plan: string) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?").run(plan, expiresAt, userId);
}

export function updateUserPassword(userId: string, password: string) {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
}

export function listAllUsers() {
  const db = getDb();
  return db.prepare("SELECT id, email, name, role, plan, plan_expires_at, created_at FROM users ORDER BY created_at DESC").all();
}

export function getUsersCount() {
  const db = getDb();
  return (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
}

export function createPayment(userId: string, amount: number, plan: string, orderId: string, status = "pending") {
  const db = getDb();
  const id = uuid();
  db.prepare(
    "INSERT INTO payments (id, user_id, razorpay_order_id, amount, plan, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, userId, orderId, amount, plan, status);
  return db.prepare("SELECT * FROM payments WHERE id = ?").get(id) as any;
}

export function updatePayment(orderId: string, paymentId: string, status: string) {
  const db = getDb();
  db.prepare(
    "UPDATE payments SET razorpay_payment_id = ?, status = ? WHERE razorpay_order_id = ?"
  ).run(paymentId, status, orderId);
  return db.prepare("SELECT * FROM payments WHERE razorpay_order_id = ?").get(orderId) as any;
}

export function declinePayment(paymentId: string) {
  const db = getDb();
  db.prepare("UPDATE payments SET status = 'failed', admin_approved = 0 WHERE id = ?").run(paymentId);
}

export function approvePayment(paymentId: string) {
  const db = getDb();
  db.prepare("UPDATE payments SET admin_approved = 1 WHERE id = ?").run(paymentId);
  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId) as any;
  if (payment) {
    updateUserPlan(payment.user_id, payment.plan);
    const subId = uuid();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "INSERT INTO subscriptions (id, user_id, plan, status, payment_id, started_at, expires_at) VALUES (?, ?, ?, 'active', ?, datetime('now'), ?)"
    ).run(subId, payment.user_id, payment.plan, paymentId, expiresAt);
  }
}

export function listPayments(limit = 50, offset = 0) {
  const db = getDb();
  const payments = db.prepare(
    `SELECT p.*, u.email as user_email, u.name as user_name
     FROM payments p JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
  const total = (db.prepare("SELECT COUNT(*) as count FROM payments").get() as any).count;
  return { payments, total };
}

export function listSubscriptions(limit = 50, offset = 0) {
  const db = getDb();
  const subs = db.prepare(
    `SELECT s.*, u.email as user_email, u.name as user_name
     FROM subscriptions s JOIN users u ON s.user_id = u.id
     ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);
  const total = (db.prepare("SELECT COUNT(*) as count FROM subscriptions").get() as any).count;
  return { subscriptions: subs, total };
}

export function getPaymentStats() {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM payments").get() as any).count;
  const completed = (db.prepare("SELECT COUNT(*) as count FROM payments WHERE status = 'completed'").get() as any).count;
  const pending = (db.prepare("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'").get() as any).count;
  const approved = (db.prepare("SELECT COUNT(*) as count FROM payments WHERE admin_approved = 1").get() as any).count;
  const revenue = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND admin_approved = 1").get() as any).total;
  const byPlan = db.prepare(
    "SELECT plan, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM payments WHERE status = 'completed' GROUP BY plan"
  ).all();
  return { total, completed, pending, approved, revenue, byPlan };
}

export function createSite(userId: string, domain: string) {
  const db = getDb();
  const id = uuid();
  const token = uuid().replace(/-/g, "").slice(0, 16);
  db.prepare(
    "INSERT INTO sites (id, user_id, domain, verification_token) VALUES (?, ?, ?, ?)"
  ).run(id, userId, domain, token);
  return db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as any;
}

export function getUserSites(userId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC").all(userId);
}

export function getSiteById(id: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as any;
}

export function deleteSite(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM sites WHERE id = ?").run(id);
}

export function verifySite(id: string) {
  const db = getDb();
  db.prepare("UPDATE sites SET verified = 1 WHERE id = ?").run(id);
  return db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as any;
}

export function createSubmission(userId: string, url: string, platform: string, siteId?: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(
    "INSERT INTO submissions (id, user_id, site_id, url, platform) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, siteId || null, url, platform);
  return db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as any;
}

export function updateSubmissionStatus(id: string, status: string, response?: string) {
  const db = getDb();
  db.prepare(
    "UPDATE submissions SET status = ?, response = ? WHERE id = ?"
  ).run(status, response || null, id);
}

export function getUserSubmissions(userId: string, limit = 10) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(userId, limit);
}

export function getSubmissionStats(userId: string) {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as count FROM submissions WHERE user_id = ?").get(userId) as any).count;
  const today = (db.prepare("SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND date(created_at) = date('now')").get(userId) as any).count;
  const byPlatform = db.prepare(
    "SELECT platform, COUNT(*) as count FROM submissions WHERE user_id = ? GROUP BY platform"
  ).all(userId) as { platform: string; count: number }[];
  const byPlatformMap: Record<string, number> = {};
  byPlatform.forEach((r) => { byPlatformMap[r.platform] = r.count; });
  return { total, today, byPlatform: byPlatformMap };
}

export function getDetailedSubmissionStats(userId: string) {
  const db = getDb();

  const byPlatform = db.prepare(`
    SELECT
      platform,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as indexed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM submissions WHERE user_id = ?
    GROUP BY platform
  `).all(userId) as { platform: string; total: number; indexed: number; failed: number; pending: number }[];

  const bySite = db.prepare(`
    SELECT
      s.id,
      s.domain,
      s.verified,
      COUNT(sub.id) as total_submissions,
      SUM(CASE WHEN sub.status = 'success' THEN 1 ELSE 0 END) as indexed_pages,
      SUM(CASE WHEN sub.status = 'failed' THEN 1 ELSE 0 END) as failed_pages
    FROM sites s
    LEFT JOIN submissions sub ON sub.site_id = s.id
    WHERE s.user_id = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all(userId) as {
    id: string;
    domain: string;
    verified: number;
    total_submissions: number;
    indexed_pages: number;
    failed_pages: number;
  }[];

  const daily = db.prepare(`
    SELECT
      date(created_at) as day,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as indexed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM submissions WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `).all(userId) as { day: string; total: number; indexed: number; failed: number }[];

  const total = (db.prepare("SELECT COUNT(*) as count FROM submissions WHERE user_id = ?").get(userId) as any).count;
  const totalIndexed = (db.prepare("SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND status = 'success'").get(userId) as any).count;
  const totalFailed = (db.prepare("SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND status = 'failed'").get(userId) as any).count;
  const totalPending = total - totalIndexed - totalFailed;

  return { total, totalIndexed, totalFailed, totalPending, byPlatform, bySite, daily };
}

export function createProject(userId: string, name: string, domain?: string, description?: string) {
  const db = getDb();
  const info = db.prepare(
    "INSERT INTO projects (user_id, name, domain, description) VALUES (?, ?, ?, ?)"
  ).run(userId, name, domain || null, description || null);
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(info.lastInsertRowid) as any;
}

export function listProjects(userId: string) {
  const db = getDb();
  return db.prepare(
    `SELECT p.*, (SELECT COUNT(*) FROM analyses a WHERE a.project_id = p.id) as analysis_count
     FROM projects p WHERE p.user_id = ? ORDER BY p.created_at DESC`
  ).all(userId);
}

export function getProjectById(id: number, userId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId) as any;
}

export function deleteProject(id: number, userId: string) {
  const db = getDb();
  db.prepare("DELETE FROM analyses WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId);
}

export function createAnalysisRecord(userId: string, url: string, type: string, result: any, projectId?: number) {
  const db = getDb();
  const seoScore = result.seoScore ?? 0;
  const issueCount = (result.issues?.length ?? 0) + (result.recommendations?.length ?? 0);
  const info = db.prepare(
    "INSERT INTO analyses (user_id, project_id, url, type, status, seo_score, issue_count, result, completed_at) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, datetime('now'))"
  ).run(userId, projectId || null, url, type, seoScore, issueCount, JSON.stringify(result));
  return db.prepare("SELECT * FROM analyses WHERE id = ?").get(info.lastInsertRowid) as any;
}

export function listAnalyses(userId: string) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId);
}

export function getAnalysisById(id: number, userId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM analyses WHERE id = ? AND user_id = ?").get(id, userId) as any;
}

export function deleteAnalysisRecord(id: number, userId: string) {
  const db = getDb();
  db.prepare("DELETE FROM analyses WHERE id = ? AND user_id = ?").run(id, userId);
}
