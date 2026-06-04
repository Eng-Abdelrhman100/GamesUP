import crypto from 'crypto';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import { sendMailInternal } from '../controllers/emailController.js';

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
    const newMessage = rows[0];

    // Fire and forget email notifications
    (async () => {
      try {
        const [orders] = await pool.query('SELECT order_number, customer_name, customer_email FROM orders WHERE id = ? LIMIT 1', [order_id]);
        if (!orders.length) return;
        const order = orders[0];

        const isImage = content.startsWith('/uploads/');
        const displayContent = isImage ? '[Image Attachment]' : content;

        if (isAdmin) {
          // Notify Customer
          if (order.customer_email) {
            const userHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #dc2626;">New Message Received</h2>
                <p>Hi ${order.customer_name},</p>
                <p>You have a new message from our team regarding your order <strong>#${order.order_number}</strong>.</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                  ${displayContent}
                </div>
                <p>Please log in to your account at <a href="https://games-up.co/dashboard">games-up.co</a> to reply.</p>
              </div>
            `;
            await sendMailInternal({
              to: order.customer_email,
              subject: `New Message regarding Order #${order.order_number}`,
              html: userHtml
            });
          }
        } else {
          // Notify Admins
          const [adminUsers] = await pool.query("SELECT email FROM users WHERE role != 'customer' AND role IS NOT NULL AND email IS NOT NULL");
          const adminEmails = adminUsers.map(u => u.email);
          if (!adminEmails.includes('info@games-up.co')) {
            adminEmails.push('info@games-up.co');
          }

          const adminHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #dc2626; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Customer Message</h2>
              <p><strong>Order:</strong> #${order.order_number}</p>
              <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_email})</p>
              <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                ${displayContent}
              </div>
              <div style="margin-top: 20px;">
                <a href="https://admin.games-up.co/order-chats" style="background: #dc2626; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reply in Admin Panel</a>
              </div>
            </div>
          `;

          for (const email of adminEmails) {
            await sendMailInternal({
              to: email,
              subject: `New Message from Customer (Order #${order.order_number})`,
              html: adminHtml
            }).catch(err => console.error(`Failed to send chat alert to ${email}:`, err));
          }
        }
      } catch (err) {
        console.error('Failed to send chat email notifications:', err);
      }
    })();

    return res.json(newMessage);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to send message' });
  }
});

