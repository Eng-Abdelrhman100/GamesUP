import { verifyToken } from '../auth/authService.js';
import { pool } from '../db/pool.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

export async function authMiddleware(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return next();

    const payload = verifyToken(token);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [payload.userId]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userRow = rows[0];
    let permissions = null;
    if (userRow.permissions) {
      if (typeof userRow.permissions === 'string') {
        try {
          permissions = JSON.parse(userRow.permissions);
        } catch {
          permissions = null;
        }
      } else {
        permissions = userRow.permissions;
      }
    }
    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      name: userRow.name,
      theme: userRow.theme,
      permissions,
    };
    req.token = token;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  return next();
}

export function requireRoles(allowedRoles) {
  const allowed = new Set(allowedRoles);
  return function roleMiddleware(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (allowed.has(req.user.role)) return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
  };
}

