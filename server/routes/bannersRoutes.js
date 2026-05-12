import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const bannersRoutes = Router();

bannersRoutes.get('/banners', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM banners ORDER BY position ASC');
    return res.json({ banners: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch banners' });
  }
});

bannersRoutes.post('/banners', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const b = req.body || {};
      const [result] = await pool.query(
        `INSERT INTO banners
         (title, subtitle, badge, image_url, link, position, is_active, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.title,
          b.subtitle || null,
          b.badge || null,
          b.image_url,
          b.link || null,
          b.position ?? 0,
          b.is_active !== undefined ? !!b.is_active : true,
          b.start_date || null,
          b.end_date || null,
        ]
      );
      const [rows] = await pool.query('SELECT * FROM banners WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create banner' });
    }
  });
});

bannersRoutes.put('/banners/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const b = req.body || {};
      await pool.query(
        `UPDATE banners
         SET title = ?, subtitle = ?, badge = ?, image_url = ?, link = ?, position = ?, is_active = ?, start_date = ?, end_date = ?
         WHERE id = ?`,
        [
          b.title,
          b.subtitle || null,
          b.badge || null,
          b.image_url,
          b.link || null,
          b.position ?? 0,
          b.is_active !== undefined ? !!b.is_active : true,
          b.start_date || null,
          b.end_date || null,
          id,
        ]
      );
      const [rows] = await pool.query('SELECT * FROM banners WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update banner' });
    }
  });
});

bannersRoutes.delete('/banners/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM banners WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete banner' });
    }
  });
});

