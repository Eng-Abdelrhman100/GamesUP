import { Router } from 'express';
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
      const normalizedName = String(r.name || '').trim().toLowerCase();
      if (!normalizedName) return res.status(400).json({ success: false, error: 'Role name is required' });
      
      const permissionsJson = r.permissions ? JSON.stringify(r.permissions) : null;
      const [result] = await pool.query(
        'INSERT INTO roles (name, permissions, description) VALUES (?, ?, ?)',
        [normalizedName, permissionsJson, r.description || null]
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
      const normalizedName = String(r.name || '').trim().toLowerCase();
      if (!normalizedName) return res.status(400).json({ success: false, error: 'Role name is required' });

      const permissionsJson = r.permissions ? JSON.stringify(r.permissions) : null;
      await pool.query('UPDATE roles SET name = ?, permissions = ?, description = ? WHERE id = ?', [
        normalizedName,
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

