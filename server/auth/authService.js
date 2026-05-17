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

function toSupabaseLikeUser(row) {
  let permissions = null;
  if (row.permissions) {
    if (typeof row.permissions === 'string') {
      try {
        permissions = JSON.parse(row.permissions);
      } catch {
        permissions = null;
      }
    } else {
      permissions = row.permissions;
    }
  }
  return {
    id: row.id,
    email: row.email,
    user_metadata: {
      name: row.name || null,
      role: row.role || null,
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

  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, name, role, phone) VALUES (?, ?, ?, ?, ?)',
    [normalizedEmail, passwordHash, name || null, role, phone]
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

  const user = toSupabaseLikeUser(userRow);
  return {
    token,
    user,
  };
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

