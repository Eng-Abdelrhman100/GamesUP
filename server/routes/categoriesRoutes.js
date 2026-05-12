import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const categoriesRoutes = Router();

categoriesRoutes.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY display_order ASC');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch categories' });
  }
});

categoriesRoutes.get('/categories/footer-top', async (req, res) => {
  try {
    const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 5;
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 5;
    const [rows] = await pool.query(
      'SELECT id, name, slug, display_order, is_active FROM categories WHERE is_active = TRUE ORDER BY display_order ASC LIMIT ?',
      [safeLimit]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch categories' });
  }
});

categoriesRoutes.post('/categories', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const { name, slug, icon = null, display_order = 0, is_active = true } = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO categories (name, slug, icon, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, slug, icon, display_order, !!is_active]
      );
      const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create category' });
    }
  });
});

categoriesRoutes.put('/categories/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const { name, slug, icon, display_order, is_active } = req.body || {};
      await pool.query(
        'UPDATE categories SET name = ?, slug = ?, icon = ?, display_order = ?, is_active = ? WHERE id = ?',
        [name, slug, icon ?? null, display_order ?? 0, !!is_active, id]
      );
      const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update category' });
    }
  });
});

categoriesRoutes.delete('/categories/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM categories WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete category' });
    }
  });
});

