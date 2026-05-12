import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const attendanceRoutes = Router();

attendanceRoutes.get('/attendance', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const date = req.query.date ? String(req.query.date) : null;
      if (!date) return res.status(400).json({ success: false, error: 'date is required' });
      const [rows] = await pool.query(
        `SELECT a.*, e.name AS employee_name
         FROM attendance a
         LEFT JOIN employees e ON e.id = a.employee_id
         WHERE a.date = ?`,
        [date]
      );
      return res.json(rows.map((r) => ({ ...r, employees: r.employee_name ? { name: r.employee_name } : null })));
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch attendance' });
    }
  });
});

attendanceRoutes.post('/attendance', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const a = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO attendance (employee_id, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)',
        [a.employee_id || null, a.date || null, a.check_in || null, a.check_out || null, a.status || null]
      );
      const [rows] = await pool.query('SELECT * FROM attendance WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create attendance' });
    }
  });
});

attendanceRoutes.put('/attendance/:id', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const id = req.params.id;
      const a = req.body || {};
      await pool.query(
        'UPDATE attendance SET employee_id = ?, date = ?, check_in = ?, check_out = ?, status = ? WHERE id = ?',
        [a.employee_id || null, a.date || null, a.check_in || null, a.check_out || null, a.status || null, id]
      );
      const [rows] = await pool.query('SELECT * FROM attendance WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update attendance' });
    }
  });
});

