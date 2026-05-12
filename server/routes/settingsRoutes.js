import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const settingsRoutes = Router();

settingsRoutes.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    for (const row of rows) settings[row.setting_key] = row.setting_value;
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
  }
});

settingsRoutes.put('/settings', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const input = req.body || {};
      const entries = Object.entries(input);
      if (!entries.length) return res.json({ success: true });

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const [key, value] of entries) {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          await conn.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
            [key, stringValue]
          );
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
      return res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
    }
  });
});

