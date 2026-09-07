// Runs db/schema.sql against your MySQL server. Usage: npm run db:init
// Reads DATABASE_URL (or DB_* vars) from the environment / .env.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env loader (no dependency) so `npm run db:init` works out of the box.
try {
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env, rely on real env */ }

const sql = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

const conn = await mysql.createConnection(
  process.env.DATABASE_URL
    ? { uri: process.env.DATABASE_URL, multipleStatements: true }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
      },
);

console.log('Applying db/schema.sql …');
await conn.query(sql);
await conn.end();
console.log('✔ Schema applied.');
