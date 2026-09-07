import 'server-only';
import mysql from 'mysql2/promise';

// Single shared pool across hot-reloads in dev.
let pool = globalThis.__cu_pool;

function createPool() {
  const url = process.env.DATABASE_URL;
  const base = {
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    // Return DATETIME as JS strings we control, not tz-shifted Date objects.
    dateStrings: true,
  };
  if (url) return mysql.createPool({ uri: url, ...base });
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clickup_forms',
    ...base,
  });
}

export function getPool() {
  if (!pool) {
    pool = createPool();
    if (process.env.NODE_ENV !== 'production') globalThis.__cu_pool = pool;
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

// Run fn inside a single transaction — commit on success, rollback on throw.
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

// mysql2 returns JSON columns already parsed, but guard against string values.
export function asJson(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}
