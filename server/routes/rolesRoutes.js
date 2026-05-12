import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const rolesRoutes = Router();

rolesRoutes.get('/roles', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM roles ORDER BY id ASC');
      const normalized = rows.map((r) => ({
        ...r,
        permissions: r.permissions ? JSON.parse(r.permissions) : null,
      }));
      return res.json({ roles: normalized });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch roles' });
    }
  });
});

rolesRoutes.post('/roles', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const r = req.body || {};
      const permissionsJson = r.permissions ? JSON.stringify(r.permissions) : null;
      const [result] = await pool.query(
        'INSERT INTO roles (name, permissions, description) VALUES (?, ?, ?)',
        [r.name, permissionsJson, r.description || null]
      );
      const [rows] = await pool.query('SELECT * FROM roles WHERE id = ? LIMIT 1', [result.insertId]);
      const row = rows[0];
      return res.json({ ...row, permissions: row.permissions ? JSON.parse(row.permissions) : null });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create role' });
    }
  });
});

rolesRoutes.put('/roles/:id', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const id = req.params.id;
      const r = req.body || {};
      const permissionsJson = r.permissions ? JSON.stringify(r.permissions) : null;
      await pool.query('UPDATE roles SET name = ?, permissions = ?, description = ? WHERE id = ?', [
        r.name,
        permissionsJson,
        r.description || null,
        id,
      ]);
      const [rows] = await pool.query('SELECT * FROM roles WHERE id = ? LIMIT 1', [id]);
      const row = rows[0];
      return res.json({ ...row, permissions: row.permissions ? JSON.parse(row.permissions) : null });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update role' });
    }
  });
});

rolesRoutes.delete('/roles/:id', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM roles WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete role' });
    }
  });
});

rolesRoutes.post('/admin/users', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const u = req.body || {};
      const normalizedEmail = String(u.email || '').trim().toLowerCase();
      if (!normalizedEmail || !u.password || !u.name) {
        return res.status(400).json({ success: false, error: 'name, email, password are required' });
      }

      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (existing.length) return res.status(409).json({ success: false, error: 'User already registered' });

      const hash = await bcrypt.hash(u.password, 10);
      const role = u.role || 'staff';
      const permissionsJson = u.permissions ? JSON.stringify(u.permissions) : null;

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [userResult] = await conn.query(
          'INSERT INTO users (email, password_hash, name, role, permissions, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [normalizedEmail, hash, u.name, role, permissionsJson, u.phone || null, u.avatar || null]
        );

        await conn.query(
          'INSERT INTO employees (name, email, role, department, phone, image, status, join_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            u.name,
            normalizedEmail,
            role,
            u.department || 'General',
            u.phone || null,
            u.avatar || null,
            'Active',
            new Date().toISOString().split('T')[0],
          ]
        );

        await conn.commit();
        return res.json({ success: true, userId: userResult.insertId });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create admin user' });
    }
  });
});

