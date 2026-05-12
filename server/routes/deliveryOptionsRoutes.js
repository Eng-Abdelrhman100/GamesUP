import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const deliveryOptionsRoutes = Router();

deliveryOptionsRoutes.get('/delivery-options', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM delivery_options ORDER BY id ASC');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch delivery options' });
  }
});

deliveryOptionsRoutes.post('/delivery-options', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const o = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO delivery_options (name, description, price, estimated_days, active) VALUES (?, ?, ?, ?, ?)',
        [o.name, o.description || null, o.price ?? null, o.estimated_days || null, o.active !== undefined ? !!o.active : true]
      );
      const [rows] = await pool.query('SELECT * FROM delivery_options WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create delivery option' });
    }
  });
});

deliveryOptionsRoutes.put('/delivery-options/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const o = req.body || {};
      await pool.query(
        'UPDATE delivery_options SET name = ?, description = ?, price = ?, estimated_days = ?, active = ? WHERE id = ?',
        [o.name, o.description || null, o.price ?? null, o.estimated_days || null, o.active !== undefined ? !!o.active : true, id]
      );
      const [rows] = await pool.query('SELECT * FROM delivery_options WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update delivery option' });
    }
  });
});

deliveryOptionsRoutes.delete('/delivery-options/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM delivery_options WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete delivery option' });
    }
  });
});

