import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const employeesRoutes = Router();

employeesRoutes.get('/employees', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM employees ORDER BY id DESC');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch employees' });
    }
  });
});

employeesRoutes.post('/employees', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const e = req.body || {};
      const email = e.email ? String(e.email).trim().toLowerCase() : null;
      const shouldCreateUser = !!(email && e.password && e.name);
      const role = String(e.role || 'staff').trim().toLowerCase();
      const department = e.department || e.job_title || null;

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        if (shouldCreateUser) {
          const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
          if (Array.isArray(existing) && existing.length > 0) {
            return res.status(409).json({ success: false, error: 'User already registered' });
          }

          const hash = await bcrypt.hash(String(e.password), 10);
          await conn.query(
            'INSERT INTO users (email, password_hash, name, role, permissions, phone, avatar, job_title, identity_document) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              email,
              hash,
              e.name,
              role,
              e.permissions ? JSON.stringify(e.permissions) : null,
              e.phone || null,
              e.avatar || e.image || null,
              e.job_title || department,
              e.identity_document || null,
            ]
          );
        }

        const [result] = await conn.query(
          `INSERT INTO employees
           (name, role, department, email, phone, status, join_date, salary, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            e.name,
            role || null,
            department,
            email,
            e.phone || null,
            e.status || 'Active',
            e.join_date || null,
            e.salary ?? null,
            e.image || e.avatar || null,
          ]
        );

        await conn.commit();
        const insertId = result?.insertId;
        const [rows] = await pool.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [insertId]);
        return res.json(rows[0]);
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create employee' });
    }
  });
});

employeesRoutes.put('/employees/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const e = req.body || {};
      const [beforeRows] = await pool.query('SELECT id, email FROM employees WHERE id = ? LIMIT 1', [id]);
      if (!beforeRows.length) return res.status(404).json({ success: false, error: 'Employee not found' });

      const currentEmail = beforeRows[0].email ? String(beforeRows[0].email).trim().toLowerCase() : null;
      const nextEmail = e.email ? String(e.email).trim().toLowerCase() : currentEmail;
      const nextRole = e.role ? String(e.role).trim().toLowerCase() : undefined;
      const nextDepartment = e.department || e.job_title || undefined;

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.query(
          `UPDATE employees
           SET name = ?,
               role = ?,
               department = ?,
               email = ?,
               phone = ?,
               status = ?,
               join_date = ?,
               salary = ?,
               image = ?
           WHERE id = ?`,
          [
            e.name,
            nextRole || null,
            nextDepartment || null,
            nextEmail,
            e.phone || null,
            e.status || 'Active',
            e.join_date || null,
            e.salary ?? null,
            e.image || e.avatar || null,
            id,
          ]
        );

        if (currentEmail) {
          if (nextEmail && nextEmail !== currentEmail) {
            const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [nextEmail]);
            if (Array.isArray(existing) && existing.length > 0) {
              return res.status(409).json({ success: false, error: 'Email already in use' });
            }
          }

          if (e.password) {
            const hash = await bcrypt.hash(String(e.password), 10);
            await conn.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, currentEmail]);
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
             WHERE email = ?`,
            [
              nextEmail,
              e.name ?? null,
              nextRole ?? null,
              e.permissions === undefined ? null : JSON.stringify(e.permissions),
              e.job_title ?? nextDepartment ?? null,
              e.phone ?? null,
              e.avatar ?? e.image ?? null,
              e.identity_document ?? null,
              currentEmail,
            ]
          );
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      const [rows] = await pool.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update employee' });
    }
  });
});

employeesRoutes.delete('/employees/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const [rows] = await pool.query('SELECT id, email FROM employees WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.json({ success: true });

      const email = rows[0].email ? String(rows[0].email).trim().toLowerCase() : null;

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM employees WHERE id = ?', [id]);
        if (email) {
          await conn.query('DELETE FROM users WHERE email = ?', [email]);
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete employee' });
    }
  });
});
