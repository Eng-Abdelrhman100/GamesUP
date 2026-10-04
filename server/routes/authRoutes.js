import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { login, register } from '../auth/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { pool } from '../db/pool.js';

export const authRoutes = Router();

authRoutes.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(name).trim();
    const user = await register({ email, password, name: cleanName, role: 'customer', phone: cleanPhone });

    await pool.query(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)',
      [user.user_metadata?.name || cleanName, user.email, cleanPhone]
    );

    return res.json({ user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message || 'Registration failed' });
  }
});

authRoutes.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const { token, user } = await login({ email, password });
    return res.json({
      user,
      session: { access_token: token, user },
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message || 'Login failed' });
  }
});

authRoutes.get('/auth/me', requireAuth, async (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      user_metadata: {
        name: req.user.name || null,
        role: req.user.role || null,
        theme: req.user.theme || null,
        phone: req.user.phone || null,
        permissions: req.user.permissions || null,
      },
    },
  });
});

authRoutes.put('/auth/profile', requireAuth, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      city,
      state,
      zipCode,
      theme,
      permissions,
    } = req.body || {};

    if (req.user.role === 'customer') {
      if (name !== undefined && (!name || !String(name).trim())) {
        return res.status(400).json({ success: false, error: 'Full name is required' });
      }
      if (phone !== undefined && (!phone || !String(phone).trim())) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
      }
    }

    const cleanName = name !== undefined ? (name ? String(name).trim() : null) : undefined;
    const cleanPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : undefined;

    const permissionsJson = permissions === undefined ? undefined : JSON.stringify(permissions);

    await pool.query(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           zip_code = COALESCE(?, zip_code),
           theme = COALESCE(?, theme),
           permissions = COALESCE(?, permissions)
       WHERE id = ?`,
      [
        cleanName ?? null,
        cleanPhone ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        zipCode ?? null,
        theme ?? null,
        permissionsJson ?? null,
        req.user.id,
      ]
    );

    if (req.user.role === 'customer') {
      await pool.query(
        'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)',
        [cleanName || req.user.name || 'Customer', req.user.email, cleanPhone || null]
      );
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const row = rows[0];
    const updatedUser = {
      id: row.id,
      email: row.email,
      user_metadata: {
        name: row.name || null,
        role: row.role ? String(row.role).trim().toLowerCase() : null,
        theme: row.theme || null,
        permissions: row.permissions ? JSON.parse(row.permissions) : null,
        phone: row.phone || null,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        zipCode: row.zip_code || null,
      },
    };

    return res.json({ user: updatedUser });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update profile' });
  }
});

authRoutes.put('/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ success: false, error: 'newPassword is required' });

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

    if (currentPassword) {
      const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid current password' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to change password' });
  }
});

