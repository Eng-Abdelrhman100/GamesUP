import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';
import { v4 as uuidv4 } from 'uuid';

export const clientFoldersRoutes = Router();

// GET /api/client-folders
// Admin/Manager: returns all folders
// Public: returns only active and public folders
clientFoldersRoutes.get('/client-folders', async (req, res) => {
  try {
    const isAdmin = req.user && ['admin', 'manager', 'staff'].includes(req.user.role);
    
    let query = 'SELECT * FROM client_folders';
    const values = [];

    if (!isAdmin) {
      query += ' WHERE status = "Active" AND is_public = TRUE';
    }

    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, values);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch folders' });
  }
});

// POST /api/client-folders (Admin only)
clientFoldersRoutes.post('/client-folders', requireRoles(['admin', 'manager']), async (req, res) => {
  try {
    const { name, description, status = 'Active', is_public = false } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'Folder name is required' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO client_folders (id, name, description, status, is_public) VALUES (?, ?, ?, ?, ?)',
      [id, name, description || null, status, !!is_public]
    );

    const [rows] = await pool.query('SELECT * FROM client_folders WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create folder' });
  }
});

// PUT /api/client-folders/:id (Admin only)
clientFoldersRoutes.put('/client-folders/:id', requireRoles(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, is_public } = req.body || {};
    
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(!!is_public); }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    values.push(id);
    await pool.query(`UPDATE client_folders SET ${updates.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query('SELECT * FROM client_folders WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update folder' });
  }
});

// DELETE /api/client-folders/:id (Admin only)
clientFoldersRoutes.delete('/client-folders/:id', requireRoles(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM client_folders WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete folder' });
  }
});

// GET /api/client-folders/:id/items (Admin only for full view)
clientFoldersRoutes.get('/client-folders/:id/items', requireRoles(['admin', 'manager', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM client_folder_items WHERE folder_id = ? ORDER BY created_at DESC', [id]);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch items' });
  }
});

// POST /api/client-folders/:id/items (Admin & Public)
clientFoldersRoutes.post('/client-folders/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content, uploader_info } = req.body || {};

    if (!type || !content) return res.status(400).json({ success: false, error: 'Type and content are required' });
    if (!['image', 'link'].includes(type)) return res.status(400).json({ success: false, error: 'Invalid item type' });

    // If public, check if folder is active and public
    const isAdmin = req.user && ['admin', 'manager', 'staff'].includes(req.user.role);
    if (!isAdmin) {
      const [fRows] = await pool.query('SELECT * FROM client_folders WHERE id = ? AND status = "Active" AND is_public = TRUE LIMIT 1', [id]);
      if (fRows.length === 0) return res.status(403).json({ success: false, error: 'Folder not found or not accessible' });
    }

    const itemId = uuidv4();
    await pool.query(
      'INSERT INTO client_folder_items (id, folder_id, type, content, uploader_info) VALUES (?, ?, ?, ?, ?)',
      [itemId, id, type, content, uploader_info || null]
    );

    const [rows] = await pool.query('SELECT * FROM client_folder_items WHERE id = ? LIMIT 1', [itemId]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to add item to folder' });
  }
});

// DELETE /api/client-folder-items/:id (Admin only)
clientFoldersRoutes.delete('/client-folder-items/:id', requireRoles(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM client_folder_items WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete item' });
  }
});
