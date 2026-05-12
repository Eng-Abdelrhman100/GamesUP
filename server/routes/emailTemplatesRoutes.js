import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const emailTemplatesRoutes = Router();

emailTemplatesRoutes.get('/email-templates', async (req, res) => {
  try {
    const type = req.query.type ? String(req.query.type) : null;
    if (type) {
      const [rows] = await pool.query('SELECT * FROM email_templates WHERE type = ? LIMIT 1', [type]);
      return res.json(rows[0] || null);
    }

    return requireRoles(['admin'])(req, res, async () => {
      const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY id ASC');
      return res.json(rows);
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch email templates' });
  }
});

emailTemplatesRoutes.post('/email-templates', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const t = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO email_templates (type, subject, body) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE subject = VALUES(subject), body = VALUES(body)',
        [t.type, t.subject || null, t.body || null]
      );

      const templateId = result.insertId || null;
      if (templateId) {
        const [rows] = await pool.query('SELECT * FROM email_templates WHERE id = ? LIMIT 1', [templateId]);
        return res.json(rows[0]);
      }

      const [rows] = await pool.query('SELECT * FROM email_templates WHERE type = ? LIMIT 1', [t.type]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create template' });
    }
  });
});

emailTemplatesRoutes.put('/email-templates/:id', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const id = req.params.id;
      const t = req.body || {};
      await pool.query('UPDATE email_templates SET type = ?, subject = ?, body = ? WHERE id = ?', [
        t.type,
        t.subject || null,
        t.body || null,
        id,
      ]);
      const [rows] = await pool.query('SELECT * FROM email_templates WHERE id = ? LIMIT 1', [id]);
      return res.json(rows[0]);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update template' });
    }
  });
});

emailTemplatesRoutes.delete('/email-templates/:id', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM email_templates WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete template' });
    }
  });
});

