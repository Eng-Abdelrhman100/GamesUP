import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing required environment variable: JWT_SECRET');
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return null;
  if (r === 'mgr' || r === 'managerial' || r.startsWith('manager')) return 'manager';
  if (r === 'employee') return 'staff';
  if (r === 'superadmin' || r === 'super_admin' || r === 'administrator') return 'admin';
  return r;
}

function parsePermissions(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function toSupabaseLikeUser(row, permissionsOverride) {
  const permissions = permissionsOverride !== undefined ? permissionsOverride : parsePermissions(row.permissions);
  const normalizedRole = normalizeRole(row.role);
  return {
    id: row.id,
    email: row.email,
    user_metadata: {
      name: row.name || null,
      role: normalizedRole,
      theme: row.theme || null,
      permissions,
      phone: row.phone || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      zipCode: row.zip_code || null,
    },
  };
}

export async function register({ email, password, name, role = 'customer', phone = null }) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (existing.length > 0) {
    const err = new Error('User already registered');
    err.statusCode = 409;
    throw err;
  }

  const normalizedRole = normalizeRole(role) || String(role || 'customer').trim().toLowerCase();

  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, name, role, phone) VALUES (?, ?, ?, ?, ?)',
    [normalizedEmail, passwordHash, name || null, normalizedRole, phone]
  );

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
  return toSupabaseLikeUser(rows[0]);
}

export async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);

  if (rows.length === 0) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const userRow = rows[0];
  const ok = await bcrypt.compare(password, userRow.password_hash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: userRow.id, email: userRow.email },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );

  const roleName = normalizeRole(userRow.role);
  let effectivePermissions = parsePermissions(userRow.permissions);
  if (!effectivePermissions) {
    const [roleRows] = await pool.query(
      'SELECT permissions FROM roles WHERE name = ? OR name = ? LIMIT 1',
      [roleName, userRow.role]
    );
    effectivePermissions = parsePermissions(roleRows?.[0]?.permissions);
  }
  const user = toSupabaseLikeUser(userRow, effectivePermissions);
  return {
    token,
    user,
  };
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

