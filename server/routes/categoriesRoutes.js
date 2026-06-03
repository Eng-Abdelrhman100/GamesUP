import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const categoriesRoutes = Router();

async function ensureGameRequestsTableExists() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS game_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      region VARCHAR(64) NULL,
      account_type VARCHAR(64) NULL,
      notes TEXT NULL,
      image_url VARCHAR(512) NULL,
      customer_name VARCHAR(255) NULL,
      customer_email VARCHAR(255) NULL,
      customer_phone VARCHAR(64) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_created (status, created_at),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

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

categoriesRoutes.get('/sub-categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sub_categories WHERE is_active = TRUE ORDER BY display_order ASC, id ASC');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch sub-categories' });
  }
});

categoriesRoutes.get('/sub-sub-categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sub_sub_categories WHERE is_active = TRUE ORDER BY display_order ASC, id ASC');
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch sub-sub-categories' });
  }
});

categoriesRoutes.post('/sub-sub-categories', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const { sub_category_id, name, slug, display_order = 0, is_active = true } = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO sub_sub_categories (sub_category_id, name, slug, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
        [sub_category_id, name, slug, display_order, !!is_active]
      );
      const [rows] = await pool.query('SELECT * FROM sub_sub_categories WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create sub-sub-category' });
    }
  });
});

categoriesRoutes.put('/sub-sub-categories/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const { sub_category_id, name, slug, display_order, is_active } = req.body || {};
      await pool.query(
        'UPDATE sub_sub_categories SET sub_category_id = ?, name = ?, slug = ?, display_order = ?, is_active = ? WHERE id = ?',
        [sub_category_id, name, slug, display_order ?? 0, !!is_active, id]
      );
      const [rows] = await pool.query('SELECT * FROM sub_sub_categories WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update sub-sub-category' });
    }
  });
});

categoriesRoutes.delete('/sub-sub-categories/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM sub_sub_categories WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete sub-sub-category' });
    }
  });
});

categoriesRoutes.post('/game-requests', async (req, res) => {
  try {
    await ensureGameRequestsTableExists();
    const input = req.body || {};
    const title = String(input.title || '').trim();
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });

    const region = input.region ? String(input.region).trim() : null;
    const accountType = input.account_type ? String(input.account_type).trim() : input.accountType ? String(input.accountType).trim() : null;
    const notes = input.notes ? String(input.notes).trim() : null;
    const imageUrl = input.image_url ? String(input.image_url).trim() : input.imageUrl ? String(input.imageUrl).trim() : null;
    const customerName = input.customer_name ? String(input.customer_name).trim() : input.customerName ? String(input.customerName).trim() : null;
    const customerEmail = input.customer_email ? String(input.customer_email).trim() : input.customerEmail ? String(input.customerEmail).trim() : null;
    const customerPhone = input.customer_phone ? String(input.customer_phone).trim() : input.customerPhone ? String(input.customerPhone).trim() : null;

    const [result] = await pool.query(
      `INSERT INTO game_requests
        (title, region, account_type, notes, image_url, customer_name, customer_email, customer_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [title, region, accountType, notes, imageUrl, customerName, customerEmail, customerPhone]
    );

    const [rows] = await pool.query('SELECT * FROM game_requests WHERE id = ? LIMIT 1', [result.insertId]);
    return res.json({ success: true, request: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to submit request' });
  }
});

categoriesRoutes.get('/admin/game-requests', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      await ensureGameRequestsTableExists();
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 25;
      const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 200 ? limit : 25;
      const [rows] = await pool.query('SELECT * FROM game_requests ORDER BY created_at DESC, id DESC LIMIT ?', [safeLimit]);
      return res.json({ requests: rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch requests' });
    }
  });
});

categoriesRoutes.put('/admin/game-requests/:id', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      await ensureGameRequestsTableExists();
      const id = req.params.id;
      const input = req.body || {};
      const status = input.status !== undefined ? String(input.status).trim() : undefined;
      const notes = input.notes !== undefined ? String(input.notes).trim() : undefined;
      const updates = [];
      const values = [];
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status || 'new');
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes || null);
      }
      if (!updates.length) return res.status(400).json({ success: false, error: 'No valid fields' });
      values.push(id);
      await pool.query(`UPDATE game_requests SET ${updates.join(', ')} WHERE id = ?`, values);
      const [rows] = await pool.query('SELECT * FROM game_requests WHERE id = ? LIMIT 1', [id]);
      return res.json({ success: true, request: rows[0] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update request' });
    }
  });
});

