import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles, requirePermission } from '../middleware/authMiddleware.js';

export const customersRoutes = Router();

async function ensureCustomerColumns() {
  const alters = [
    `ALTER TABLE customers ADD COLUMN preferred_platform VARCHAR(64) NULL AFTER phone`,
    `ALTER TABLE customers ADD COLUMN marketing_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER preferred_platform`,
    `ALTER TABLE customers ADD COLUMN avg_order_value DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER marketing_consent`,
    `ALTER TABLE customers ADD COLUMN purchase_frequency DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER avg_order_value`,
    `ALTER TABLE customers ADD COLUMN purchased_products JSON NULL AFTER purchase_frequency`,
  ];
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
}

let columnsEnsured = false;
async function ensureSchema() {
  if (columnsEnsured) return;
  try {
    await ensureCustomerColumns();
  } catch (err) {
    console.error('Warning: failed to ensure customer columns:', err?.message || err);
  }
  columnsEnsured = true;
}

function parsePurchased(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// TASK 05: metrics are always calculated from transaction records so AOV and
// frequency stay consistent. Refunded/cancelled orders count in history but not revenue.
async function buildCustomerRows() {
  await ensureSchema();
  const [orderAgg] = await pool.query(
    `SELECT
       LOWER(customer_email) AS email,
       MAX(customer_name) AS name_from_orders,
       MAX(phone) AS phone_from_orders,
       MAX(preferred_platform) AS platform_from_orders,
       COUNT(*) AS orders_count_all,
       SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'refunded') THEN COALESCE(amount, 0) ELSE 0 END) AS total_spent,
       SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'refunded') THEN 1 ELSE 0 END) AS orders_count,
       SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'refunded') THEN COALESCE(amount, 0) ELSE 0 END) / NULLIF(SUM(CASE WHEN LOWER(status) NOT IN ('cancelled', 'refunded') THEN 1 ELSE 0 END), 0) AS avg_order_value,
       MIN(created_at) AS first_order_date,
       MAX(CASE WHEN LOWER(status) NOT IN ('cancelled', 'refunded') THEN created_at ELSE NULL END) AS last_order_date,
       GROUP_CONCAT(DISTINCT product_name SEPARATOR '||') AS products_blob
      FROM orders
      WHERE customer_email IS NOT NULL
      GROUP BY LOWER(customer_email)`
  );

  let overrideCols = 'email, name, phone, created_at';
  try {
    const [colRows] = await pool.query('SHOW COLUMNS FROM customers');
    const names = new Set((colRows || []).map((c) => String(c.Field)));
    const extras = ['preferred_platform', 'marketing_consent', 'avg_order_value', 'purchase_frequency', 'purchased_products']
      .filter((c) => names.has(c));
    if (extras.length) overrideCols += `, ${extras.join(', ')}`;
  } catch { /* fall back to base columns */ }
  const [customerRows] = await pool.query(`SELECT ${overrideCols} FROM customers`);
  const customerOverrides = new Map(
    (customerRows || []).map((c) => [String(c.email).toLowerCase(), c])
  );

  return (orderAgg || []).map((row) => {
    const email = String(row.email || '').toLowerCase();
    const override = customerOverrides.get(email);
    const spent = Number(row.total_spent) || 0;
    const ordersCount = Number(row.orders_count) || 0;
    const avgOrderValue = Number(row.avg_order_value) || (ordersCount ? spent / ordersCount : 0);
    const joinDate = override?.created_at
      ? new Date(override.created_at).toLocaleDateString()
      : row.first_order_date
        ? new Date(row.first_order_date).toLocaleDateString()
        : '';
    const purchased = String(row.products_blob || '')
      .split('||')
      .flatMap((s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean));
    const uniquePurchased = [...new Set(purchased)].slice(0, 100);

    return {
      id: email,
      name: (override?.name || row.name_from_orders || 'Unknown'),
      email,
      phone: override?.phone || row.phone_from_orders || '',
      preferred_platform: override?.preferred_platform || row.platform_from_orders || '',
      purchased_products: override?.purchased_products ? parsePurchased(override.purchased_products) : uniquePurchased,
      orders: ordersCount,
      orders_all: Number(row.orders_count_all) || 0,
      spent,
      avg_order_value: override?.avg_order_value != null ? Number(override.avg_order_value) || avgOrderValue : avgOrderValue,
      purchase_frequency: override?.purchase_frequency != null ? Number(override.purchase_frequency) || 0 : 0,
      last_purchase_date: row.last_order_date || null,
      lastOrder: row.last_order_date,
      marketing_consent: !!(override?.marketing_consent),
      location: 'Unknown',
      joinDate,
      status: spent > 500 ? 'VIP' : 'Active',
    };
  });
}

customersRoutes.get('/customers', requirePermission('customers', 'read'), async (req, res) => {
  try {
    const customers = await buildCustomerRows();
    customers.sort((a, b) => (b.spent || 0) - (a.spent || 0));
    return res.json({ customers });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch customers' });
  }
});

// TASK 05: authorized business reporting export (CSV).
customersRoutes.get('/customers/export', requirePermission('customers', 'read'), async (req, res) => {
  try {
    const customers = await buildCustomerRows();
    const header = ['name', 'email', 'phone', 'preferred_platform', 'orders', 'total_spent', 'avg_order_value', 'last_purchase_date', 'purchase_frequency', 'marketing_consent', 'purchased_products'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const c of customers) {
      lines.push([
        esc(c.name), esc(c.email), esc(c.phone), esc(c.preferred_platform), c.orders,
        Number(c.spent || 0).toFixed(2), Number(c.avg_order_value || 0).toFixed(2),
        esc(c.last_purchase_date ? new Date(c.last_purchase_date).toISOString() : ''),
        Number(c.purchase_frequency || 0).toFixed(2), c.marketing_consent ? 1 : 0,
        esc((c.purchased_products || []).join(' | ')),
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customers_export_${Date.now()}.csv"`);
    return res.send(lines.join('\n'));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to export customers' });
  }
});

// TASK 05: an authorized administrator can view a customer's order history.
customersRoutes.get('/customers/:id/orders', requirePermission('customers', 'read'), async (req, res) => {
  try {
    const email = String(req.params.id || '').toLowerCase();
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE LOWER(customer_email) = ? ORDER BY created_at DESC',
      [email]
    );
    const orders = (rows || []).map((r) => ({
      ...r,
      digital_delivery: (() => { try { return typeof r.digital_delivery === 'string' ? JSON.parse(r.digital_delivery) : r.digital_delivery; } catch { return null; } })(),
      shipping_address: (() => { try { return typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address; } catch { return null; } })(),
    }));
    return res.json({ orders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch customer orders' });
  }
});

customersRoutes.put('/customers/:id', requirePermission('customers', 'write'), async (req, res) => {
  try {
    await ensureSchema();
    const email = String(req.params.id || '').toLowerCase();
    const c = req.body || {};
    const name = c.name || 'Unknown';
    const phone = c.phone || null;
    const preferredPlatform = c.preferred_platform || c.preferredPlatform || null;
    // Marketing consent is tracked separately from transactional contact info.
    const marketingConsent = c.marketing_consent === true || c.marketing_consent === 1 || c.marketing_consent === '1' ? 1 : 0;

    await pool.query(
      `INSERT INTO customers (name, email, phone, preferred_platform, marketing_consent)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone),
         preferred_platform = VALUES(preferred_platform), marketing_consent = VALUES(marketing_consent)`,
      [name, email, phone, preferredPlatform, marketingConsent]
    );

    const customers = await buildCustomerRows();
    const updated = customers.find((x) => x.email === email);
    return res.json(updated || { id: email, email, name, phone });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update customer' });
  }
});

customersRoutes.delete('/customers/:id', requirePermission('customers', 'write'), async (req, res) => {
  try {
    const email = String(req.params.id || '').toLowerCase();
    await pool.query('DELETE FROM customers WHERE LOWER(email) = ?', [email]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete customer' });
  }
});
