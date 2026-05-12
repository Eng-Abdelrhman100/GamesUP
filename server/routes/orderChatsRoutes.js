import crypto from 'crypto';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';

export const orderChatsRoutes = Router();

orderChatsRoutes.get('/order-chats', requireAuth, async (req, res) => {
  try {
    const orderId = req.query.orderId ? String(req.query.orderId) : null;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });

    const isAdmin = ['admin', 'manager', 'staff'].includes(req.user.role);
    if (!isAdmin) {
      const [orders] = await pool.query('SELECT customer_email FROM orders WHERE id = ? LIMIT 1', [orderId]);
      if (!orders.length) return res.status(404).json({ success: false, error: 'Order not found' });
      const customerEmail = orders[0].customer_email;
      if (!customerEmail || customerEmail.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const [rows] = await pool.query(
      'SELECT * FROM order_chats WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch chats' });
  }
});

orderChatsRoutes.get('/admin/order-chats', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM order_chats ORDER BY created_at DESC');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch chats' });
    }
  });
});

orderChatsRoutes.post('/order-chats', requireAuth, async (req, res) => {
  try {
    const { order_id, content } = req.body || {};
    if (!order_id || !content) return res.status(400).json({ success: false, error: 'order_id and content required' });

    const isAdmin = ['admin', 'manager', 'staff'].includes(req.user.role);
    const id = crypto.randomUUID();
    const senderId = String(req.user.id);
    const senderName = req.user.name || req.user.email;

    await pool.query(
      'INSERT INTO order_chats (id, order_id, sender_id, sender_name, content, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
      [id, order_id, senderId, senderName, content, isAdmin]
    );

    const [rows] = await pool.query('SELECT * FROM order_chats WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to send message' });
  }
});

