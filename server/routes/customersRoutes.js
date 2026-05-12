import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const customersRoutes = Router();

customersRoutes.get('/customers', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const [orderAgg] = await pool.query(
        `SELECT
           LOWER(customer_email) AS email,
           MAX(customer_name) AS name_from_orders,
           COUNT(*) AS orders_count,
           SUM(COALESCE(amount, 0)) AS total_spent,
           MIN(created_at) AS first_order_date,
           MAX(created_at) AS last_order_date
         FROM orders
         WHERE customer_email IS NOT NULL
         GROUP BY LOWER(customer_email)`
      );

      const [customerRows] = await pool.query('SELECT email, name, phone, created_at FROM customers');
      const customerOverrides = new Map(
        (customerRows || []).map((c) => [String(c.email).toLowerCase(), c])
      );

      const customers = (orderAgg || []).map((row) => {
        const email = String(row.email || '').toLowerCase();
        const override = customerOverrides.get(email);
        const spent = Number(row.total_spent) || 0;
        const ordersCount = Number(row.orders_count) || 0;
        const joinDate = override?.created_at
          ? new Date(override.created_at).toLocaleDateString()
          : row.first_order_date
            ? new Date(row.first_order_date).toLocaleDateString()
            : '';

        return {
          id: email,
          name: (override?.name || row.name_from_orders || 'Unknown'),
          email,
          phone: override?.phone || '',
          location: 'Unknown',
          joinDate,
          orders: ordersCount,
          spent,
          status: spent > 500 ? 'VIP' : 'Active',
          lastOrder: row.last_order_date,
        };
      });

      customers.sort((a, b) => (b.spent || 0) - (a.spent || 0));

      return res.json({ customers });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch customers' });
    }
  });
});

customersRoutes.put('/customers/:id', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const email = String(req.params.id || '').toLowerCase();
      const c = req.body || {};
      const name = c.name || 'Unknown';
      const phone = c.phone || null;

      await pool.query(
        `INSERT INTO customers (name, email, phone)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)`,
        [name, email, phone]
      );

      const [orderAgg] = await pool.query(
        `SELECT
           MAX(customer_name) AS name_from_orders,
           COUNT(*) AS orders_count,
           SUM(COALESCE(amount, 0)) AS total_spent,
           MIN(created_at) AS first_order_date,
           MAX(created_at) AS last_order_date
         FROM orders
         WHERE LOWER(customer_email) = ?`,
        [email]
      );

      const [rows] = await pool.query('SELECT email, name, phone, created_at FROM customers WHERE LOWER(email) = ? LIMIT 1', [email]);
      const override = rows[0] || null;
      const agg = (orderAgg || [])[0] || {};
      const spent = Number(agg.total_spent) || 0;
      const ordersCount = Number(agg.orders_count) || 0;

      return res.json({
        id: email,
        name: override?.name || agg.name_from_orders || 'Unknown',
        email,
        phone: override?.phone || '',
        location: 'Unknown',
        joinDate: override?.created_at
          ? new Date(override.created_at).toLocaleDateString()
          : agg.first_order_date
            ? new Date(agg.first_order_date).toLocaleDateString()
            : '',
        orders: ordersCount,
        spent,
        status: spent > 500 ? 'VIP' : 'Active',
        lastOrder: agg.last_order_date || null,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update customer' });
    }
  });
});

customersRoutes.delete('/customers/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const email = String(req.params.id || '').toLowerCase();
      await pool.query('DELETE FROM customers WHERE LOWER(email) = ?', [email]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete customer' });
    }
  });
});
