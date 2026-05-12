import { verifyToken } from '../../auth/authService.js';
import { pool } from '../../db/pool.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

const adminRoles = new Set(['admin', 'manager', 'staff']);

export async function isAdmin(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const payload = verifyToken(token);
    const [rows] = await pool.query('SELECT id, email, role FROM users WHERE id = ? LIMIT 1', [payload.userId]);
    if (rows.length === 0) return res.status(401).json({ success: false, error: 'Unauthorized' });

    req.user = rows[0];
    if (adminRoles.has(rows[0].role)) return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}
