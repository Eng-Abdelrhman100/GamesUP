import { Router } from 'express';
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
      const [result] = await pool.query(
        `INSERT INTO employees
         (name, role, department, email, phone, status, join_date, salary, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.name,
          e.role || null,
          e.department || null,
          e.email || null,
          e.phone || null,
          e.status || 'Active',
          e.join_date || null,
          e.salary ?? null,
          e.image || null,
        ]
      );
      const [rows] = await pool.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
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
      await pool.query(
        `UPDATE employees
         SET name = ?, role = ?, department = ?, email = ?, phone = ?, status = ?, join_date = ?, salary = ?, image = ?
         WHERE id = ?`,
        [
          e.name,
          e.role || null,
          e.department || null,
          e.email || null,
          e.phone || null,
          e.status || 'Active',
          e.join_date || null,
          e.salary ?? null,
          e.image || null,
          id,
        ]
      );
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
      await pool.query('DELETE FROM employees WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete employee' });
    }
  });
});

