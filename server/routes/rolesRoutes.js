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

rolesRoutes.get('/admin/users', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const [rows] = await pool.query(
        `SELECT id, email, name, role, permissions, job_title, phone, avatar, identity_document, created_at
         FROM users
         WHERE role IN ('admin', 'manager', 'staff')
         ORDER BY id DESC`
      );
      const normalized = rows.map((u) => {
        let permissions = null;
        if (u.permissions) {
          if (typeof u.permissions === 'string') {
            try {
              permissions = JSON.parse(u.permissions);
            } catch {
              permissions = null;
            }
          } else {
            permissions = u.permissions;
          }
        }
        return { ...u, permissions };
      });
      return res.json(normalized);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch users' });
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
      const department = u.department || u.job_title || 'General';

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [userResult] = await conn.query(
          'INSERT INTO users (email, password_hash, name, role, permissions, phone, avatar, job_title, identity_document) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [normalizedEmail, hash, u.name, role, permissionsJson, u.phone || null, u.avatar || null, u.job_title || null, u.identity_document || null]
        );

        await conn.query(
          'INSERT INTO employees (name, email, role, department, phone, image, status, join_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            u.name,
            normalizedEmail,
            role,
            department,
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

rolesRoutes.put('/admin/users/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const input = req.body || {};
      const [rows] = await pool.query('SELECT id, email FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });

      const currentEmail = String(rows[0].email || '').trim().toLowerCase();
      const nextEmail = input.email ? String(input.email).trim().toLowerCase() : currentEmail;
      const nextRole = input.role || undefined;
      const permissionsJson = input.permissions === undefined ? undefined : JSON.stringify(input.permissions);
      const nextDepartment = input.department || input.job_title || undefined;

      if (nextEmail !== currentEmail) {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [nextEmail, id]);
        if (existing.length) return res.status(409).json({ success: false, error: 'Email already in use' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        if (input.password) {
          const hash = await bcrypt.hash(String(input.password), 10);
          await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
        }

        await conn.query(
          `UPDATE users
           SET email = ?,
               name = COALESCE(?, name),
               role = COALESCE(?, role),
               permissions = COALESCE(?, permissions),
               job_title = COALESCE(?, job_title),
               phone = COALESCE(?, phone),
               avatar = COALESCE(?, avatar),
               identity_document = COALESCE(?, identity_document)
           WHERE id = ?`,
          [
            nextEmail,
            input.name ?? null,
            nextRole ?? null,
            permissionsJson ?? null,
            input.job_title ?? null,
            input.phone ?? null,
            input.avatar ?? null,
            input.identity_document ?? null,
            id,
          ]
        );

        await conn.query(
          `UPDATE employees
           SET email = ?,
               name = COALESCE(?, name),
               role = COALESCE(?, role),
               department = COALESCE(?, department),
               phone = COALESCE(?, phone),
               image = COALESCE(?, image)
           WHERE email = ?`,
          [
            nextEmail,
            input.name ?? null,
            nextRole ?? null,
            nextDepartment ?? null,
            input.phone ?? null,
            input.avatar ?? null,
            currentEmail,
          ]
        );

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      const [after] = await pool.query(
        'SELECT id, email, name, role, permissions, job_title, phone, avatar, identity_document, created_at FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      const u = after[0];
      let permissions = null;
      if (u.permissions) {
        if (typeof u.permissions === 'string') {
          try {
            permissions = JSON.parse(u.permissions);
          } catch {
            permissions = null;
          }
        } else {
          permissions = u.permissions;
        }
      }
      return res.json({ ...u, permissions });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update user' });
    }
  });
});

rolesRoutes.delete('/admin/users/:id', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const id = req.params.id;
      const [rows] = await pool.query('SELECT id, email FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.json({ success: true });

      const email = String(rows[0].email || '').trim().toLowerCase();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM employees WHERE email = ?', [email]);
        await conn.query('DELETE FROM users WHERE id = ?', [id]);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete user' });
    }
  });
});

