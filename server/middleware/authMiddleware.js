import { verifyToken } from '../auth/authService.js';
import { pool } from '../db/pool.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return 'staff';
  if (r === 'mgr' || r === 'managerial' || r.startsWith('manager')) return 'manager';
  if (r === 'employee') return 'staff';
  if (r === 'superadmin' || r === 'super_admin' || r === 'administrator') return 'admin';
  return r;
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
    if (!permissions) {
      const roleName = normalizeRole(userRow.role);
      const [roleRows] = await pool.query(
        'SELECT permissions FROM roles WHERE name = ? OR name = ? LIMIT 1',
        [roleName, userRow.role]
      );
      const rolePerms = roleRows?.[0]?.permissions;
      if (rolePerms) {
        if (typeof rolePerms === 'string') {
          try {
            permissions = JSON.parse(rolePerms);
          } catch {
            permissions = null;
          }
        } else {
          permissions = rolePerms;
        }
      }
    }
    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: normalizeRole(userRow.role),
      name: userRow.name,
      theme: userRow.theme,
      phone: userRow.phone,
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
  const allowed = new Set((allowedRoles || []).map((r) => String(r || '').trim().toLowerCase()));
  return function roleMiddleware(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const role = normalizeRole(req.user.role);
    if (allowed.has(role)) return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
  };
}

