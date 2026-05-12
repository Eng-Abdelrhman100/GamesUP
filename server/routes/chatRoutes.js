import crypto from 'crypto';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const chatRoutes = Router();

const SUPPORT_ID = 'support-team';

chatRoutes.get('/chat/messages', requireAuth, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const [rows] = await pool.query(
      `SELECT *
       FROM chat_messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, SUPPORT_ID, SUPPORT_ID, userId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch messages' });
  }
});

chatRoutes.post('/chat/messages', requireAuth, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { content, image_url } = req.body || {};
    if (!content && !image_url) return res.status(400).json({ success: false, error: 'content or image_url required' });
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO chat_messages (id, sender_id, receiver_id, content, image_url) VALUES (?, ?, ?, ?, ?)',
      [id, userId, SUPPORT_ID, content || 'Sent an image', image_url || null]
    );
    const [rows] = await pool.query('SELECT * FROM chat_messages WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to send message' });
  }
});

chatRoutes.put('/chat/messages/mark-read', requireAuth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.json({ success: true });
    const placeholders = ids.map(() => '?').join(', ');
    await pool.query(
      `UPDATE chat_messages SET is_read = TRUE WHERE id IN (${placeholders})`,
      ids
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to mark read' });
  }
});

