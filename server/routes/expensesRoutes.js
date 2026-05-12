import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const expensesRoutes = Router();

expensesRoutes.get('/expenses', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
      return res.json({ expenses: rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch expenses' });
    }
  });
});

expensesRoutes.post('/expenses', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const e = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO expenses (title, description, amount, date) VALUES (?, ?, ?, ?)',
        [e.title, e.description || null, e.amount, e.date || null]
      );
      const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create expense' });
    }
  });
});

expensesRoutes.put('/expenses/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const e = req.body || {};
      await pool.query(
        'UPDATE expenses SET title = ?, description = ?, amount = ?, date = ? WHERE id = ?',
        [e.title, e.description || null, e.amount, e.date || null, id]
      );
      const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update expense' });
    }
  });
});

expensesRoutes.delete('/expenses/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete expense' });
    }
  });
});

