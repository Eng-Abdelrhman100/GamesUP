import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles, requirePermission } from '../middleware/authMiddleware.js';

export const ordersRoutes = Router();

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeOrderRow(row) {
  return {
    ...row,
    digital_delivery: parseJson(row.digital_delivery),
    shipping_address: parseJson(row.shipping_address),
  };
}

ordersRoutes.get('/orders', requirePermission('orders', 'read'), async (req, res) => {
  try {
    const params = req.query || {};
    const status = params.status ? String(params.status) : null;
    const search = params.search ? String(params.search) : null;
    const email = params.email ? String(params.email) : null;
    const inventoryId = params.inventory_id ? String(params.inventory_id) : null;

    const isAdmin = ['admin', 'manager', 'staff'].includes(req.user.role);
    if (!isAdmin) {
      if (email && email.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const where = [];
    const values = [];

    if (status) {
      where.push('status = ?');
      values.push(status);
    }
    if (search) {
      where.push('order_number LIKE ?');
      values.push(`%${search}%`);
    }
    if (email || !isAdmin) {
      where.push('LOWER(customer_email) = ?');
      values.push((email || req.user.email).toLowerCase());
    }
    if (inventoryId) {
      where.push('inventory_id = ?');
      values.push(inventoryId);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC`, values);
    return res.json({ orders: rows.map(normalizeOrderRow) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders' });
  }
});

ordersRoutes.post('/orders', async (req, res) => {
  try {
    const o = req.body || {};
    const [result] = await pool.query(
      `INSERT INTO orders
       (order_number, customer_name, customer_email, phone, product_name, date, status, amount,
        digital_email, digital_password, digital_code, digital_delivery, inventory_id,
        payment_method, payment_proof, shipping_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.order_number,
        o.customer_name,
        o.customer_email || null,
        o.phone || null,
        o.product_name || null,
        o.date || null,
        o.status || null,
        o.amount ?? null,
        o.digital_email || null,
        o.digital_password || null,
        o.digital_code || null,
        o.digital_delivery ? JSON.stringify(o.digital_delivery) : null,
        o.inventory_id || null,
        o.payment_method || null,
        o.payment_proof || null,
        o.shipping_address ? JSON.stringify(o.shipping_address) : null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [result.insertId]);
    return res.json(normalizeOrderRow(rows[0]));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create order' });
  }
});

ordersRoutes.put('/orders/:id', requirePermission('orders', 'write'), async (req, res) => {
  try {
    const id = req.params.id;
    const o = req.body || {};

    const updates = [];
    const values = [];
    const setIfDefined = (col, val) => {
      if (val !== undefined) {
        updates.push(`${col} = ?`);
        values.push(val);
      }
    };

    setIfDefined('order_number', o.order_number);
    setIfDefined('customer_name', o.customer_name);
    setIfDefined('customer_email', o.customer_email);
    setIfDefined('phone', o.phone);
    setIfDefined('product_name', o.product_name);
    setIfDefined('date', o.date);
    setIfDefined('status', o.status);
    setIfDefined('amount', o.amount);
    setIfDefined('digital_email', o.digital_email);
    setIfDefined('digital_password', o.digital_password);
    setIfDefined('digital_code', o.digital_code);
    if (o.digital_delivery !== undefined) setIfDefined('digital_delivery', o.digital_delivery ? JSON.stringify(o.digital_delivery) : null);
    setIfDefined('inventory_id', o.inventory_id);
    setIfDefined('payment_method', o.payment_method);
    setIfDefined('payment_proof', o.payment_proof);
    if (o.shipping_address !== undefined) setIfDefined('shipping_address', o.shipping_address ? JSON.stringify(o.shipping_address) : null);

    if (updates.length) {
      values.push(id);
      await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    return res.json(normalizeOrderRow(rows[0]));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update order' });
  }
});

