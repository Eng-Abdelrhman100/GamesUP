import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles, requirePermission } from '../middleware/authMiddleware.js';

export const posRoutes = Router();

posRoutes.post('/pos/invoice', async (req, res) => {
  return requirePermission('pos', 'write')(req, res, async () => {
    try {
      const invoice = req.body || {};
      const orderNumber = invoice.order_number || `ORD-${Date.now()}`;
      const productNames = (invoice.items || []).map(item => `${item.name} (x${item.quantity})`).join(', ');
      
      const [result] = await pool.query(
        `INSERT INTO orders
         (order_number, customer_name, customer_email, phone, product_name, amount, status, payment_method, inventory_id, digital_delivery)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          invoice.customerName,
          invoice.customerEmail || null,
          invoice.phone || null,
          productNames || null,
          invoice.total ?? null,
          'completed',
          'POS',
          'POS',
          invoice.items ? JSON.stringify(invoice.items) : null,
        ]
      );
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [result.insertId]);
      return res.json({ success: true, order: rows[0] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create invoice' });
    }
  });
});

posRoutes.get('/pos/invoices', async (req, res) => {
  return requirePermission('pos', 'read')(req, res, async () => {
    try {
      const [rows] = await pool.query("SELECT * FROM orders WHERE inventory_id = 'POS' ORDER BY created_at DESC");
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch invoices' });
    }
  });
});

