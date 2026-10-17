import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles, requirePermission } from '../middleware/authMiddleware.js';
import { sendMailInternal } from '../controllers/emailController.js';
import { insertAccountSalesForDelivery, setOrderSaleStatus } from './accountFinanceRoutes.js';
import { publishNewOrder, publishOrderUpdate } from '../utils/realtime.js';

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

// ASK 04 / TASK 04: canonical order + payment statuses recorded accurately.
const ORDER_STATUSES = new Set([
  'pending', 'pending_approval', 'processing', 'paid', 'completed',
  'delivered', 'shipped', 'failed', 'cancelled', 'refunded',
]);

function normalizeOrderStatus(raw, fallback = 'pending') {
  const s = String(raw || '').trim().toLowerCase();
  if (ORDER_STATUSES.has(s)) return s;
  return fallback;
}

function parseAttributes(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value) || {};
  } catch {
    return {};
  }
}

function productIsUpcoming(row) {
  const attrs = parseAttributes(row?.attributes);
  if (attrs.is_upcoming === true || attrs.isUpcoming === true) return true;
  if (String(attrs.is_upcoming || '').toLowerCase() === 'true') return true;
  if (String(attrs.availability || '').toLowerCase() === 'coming_soon') return true;
  if (String(row?.digital_game_type || '').toLowerCase() === 'upcoming') return true;
  if (String(row?.status || '').toLowerCase() === 'coming soon') return true;
  return false;
}

// ASK 01 + TASK 04: server-side inventory + price validation before order creation.
// Accepts structured `items: [{ productId, variantName, quantity, price }]` when the
// client sends them; otherwise falls back to matching legacy free-text product_name.
async function validateOrderPricing(o) {
  const items = Array.isArray(o?.items) ? o.items : [];
  if (items.length) {
    const errors = [];
    let expectedTotal = 0;
    for (const item of items) {
      const productId = item?.productId ?? item?.product_id ?? item?.gameId;
      if (productId == null || productId === '') {
        errors.push('Order item is missing a product reference.');
        continue;
      }
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [productId]);
      if (!rows.length) {
        errors.push(`Product #${productId} was not found.`);
        continue;
      }
      const row = rows[0];
      if (productIsUpcoming(row)) {
        errors.push(`"${row.name}" is coming soon and cannot be purchased yet.`);
        continue;
      }
      const [variants] = await pool.query(
        'SELECT id, name, price, stock FROM product_variants WHERE product_id = ? ORDER BY id ASC',
        [productId]
      );
      const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1));
      const variantName = item?.variantName ?? item?.tier ?? item?.variant_name ?? '';
      let unitPrice = null;
      let available = Number(row.stock) > 0;
      if (variantName) {
        const match = variants.find((v) => String(v.name).toLowerCase() === String(variantName).toLowerCase());
        if (!match) {
          errors.push(`Variant "${variantName}" is not available for "${row.name}".`);
          continue;
        }
        unitPrice = Number(match.price);
        available = Number(match.stock) > 0 || Number(row.stock) > 0;
      } else {
        const inStock = variants.filter((v) => Number(v?.stock) > 0).map((v) => Number(v?.price)).filter((n) => Number.isFinite(n) && n > 0);
        if (inStock.length) unitPrice = Math.min(...inStock);
        else unitPrice = Number(row.price);
      }
      if (!(unitPrice > 0)) {
        errors.push(`"${row.name}" has no valid price and cannot be purchased.`);
        continue;
      }
      if (!available) {
        errors.push(`"${row.name}"${variantName ? ` (${variantName})` : ''} is out of stock.`);
        continue;
      }
      const claimed = Number(item?.price);
      if (Number.isFinite(claimed) && claimed > 0 && Math.abs(claimed - unitPrice) > 0.01) {
        errors.push(`Price for "${row.name}" changed. Expected L.E ${unitPrice.toFixed(2)}.`);
        continue;
      }
      expectedTotal += unitPrice * qty;
    }
    if (errors.length) return { ok: false, errors, expectedTotal };
    return { ok: true, errors: [], expectedTotal };
  }

  // Legacy path: free-text product_name. Reject only when we can positively match a
  // product that is unavailable or zero-priced; unknown custom products (manual orders)
  // are left to staff fulfillment.
  const productName = String(o?.product_name || '').trim();
  if (!productName) return { ok: true, errors: [], expectedTotal: null };
  const [products] = await pool.query('SELECT id, name, price, stock, status, digital_game_type, attributes FROM products');
  const itemStrings = productName.split(',').map((s) => s.trim()).filter(Boolean);
  const errors = [];
  for (const itemString of itemStrings) {
    const lower = itemString.toLowerCase();
    const matched = products
      .filter((p) => lower.includes(String(p.name || '').toLowerCase()) || String(p.name || '').toLowerCase().includes(lower))
      .sort((a, b) => String(b.name || '').length - String(a.name || '').length)[0];
    if (!matched) continue;
    if (productIsUpcoming(matched)) {
      errors.push(`"${matched.name}" is coming soon and cannot be purchased yet.`);
      continue;
    }
    const price = Number(matched.price);
    const [vRows] = await pool.query('SELECT price, stock FROM product_variants WHERE product_id = ?', [matched.id]);
    const variantPrices = (vRows || []).map((v) => Number(v?.price)).filter((n) => Number.isFinite(n) && n > 0);
    const hasPrice = price > 0 || variantPrices.length > 0;
    const hasStock = Number(matched.stock) > 0 || (vRows || []).some((v) => Number(v?.stock) > 0);
    if (!hasPrice || !hasStock) {
      const onlyZeroBase = !(price > 0) && variantPrices.length === 0;
      if (!hasStock && onlyZeroBase) {
        errors.push(`"${matched.name}" is unavailable (out of stock with no valid price).`);
      }
    }
  }
  if (errors.length) return { ok: false, errors, expectedTotal: null };
  return { ok: true, errors: [], expectedTotal: null };
}

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
  const orderAlters = [
    `ALTER TABLE orders ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER id`,
    `ALTER TABLE orders ADD COLUMN preferred_platform VARCHAR(64) NULL AFTER phone`,
    `ALTER TABLE orders ADD COLUMN marketing_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER preferred_platform`,
  ];
  for (const sql of orderAlters) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
}

let customerColumnsEnsured = false;
async function ensureCustomerSchema() {
  if (customerColumnsEnsured) return;
  try {
    await ensureCustomerColumns();
  } catch (err) {
    console.error('Warning: failed to ensure customer columns:', err?.message || err);
  }
  customerColumnsEnsured = true;
}

// TASK 05: create/merge a stable customer record for every completed order.
// Dedup key is the verified lowercase email; phone-only matches are never auto-merged.
async function upsertCustomerForOrder(o) {
  await ensureCustomerSchema();
  const email = String(o?.customer_email || '').trim().toLowerCase();
  if (!email) return null;
  const name = String(o?.customer_name || 'Customer').trim() || 'Customer';
  const phone = o?.phone ? String(o.phone).trim() || null : null;
  const preferredPlatform = o?.preferred_platform ? String(o.preferred_platform).trim() || null : null;
  const marketingConsent = o?.marketing_consent === true || o?.marketing_consent === 1 || o?.marketing_consent === '1' ? 1 : 0;
  const [existing] = await pool.query('SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1', [email]);
  if (existing.length) {
    await pool.query(
      `UPDATE customers SET name = ?, phone = COALESCE(?, phone),
        preferred_platform = COALESCE(?, preferred_platform),
        marketing_consent = ?
        WHERE LOWER(email) = ?`,
      [name, phone, preferredPlatform, marketingConsent, email]
    );
    return existing[0].id;
  }
  const [result] = await pool.query(
    `INSERT INTO customers (name, email, phone, preferred_platform, marketing_consent)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, phone, preferredPlatform, marketingConsent]
  );
  return result.insertId;
}

// TASK 05: recompute order history metrics from transaction records.
// Refunded/cancelled orders are excluded from revenue metrics but kept in history.
async function refreshCustomerMetrics(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return;
  const [rows] = await pool.query(
    `SELECT amount, status, created_at, product_name FROM orders WHERE LOWER(customer_email) = ? ORDER BY created_at ASC`,
    [key]
  );
  const valid = (rows || []).filter((r) => !['cancelled', 'refunded'].includes(String(r.status || '').toLowerCase()));
  const ordersCount = valid.length;
  const totalSpent = valid.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const avgOrderValue = ordersCount ? totalSpent / ordersCount : 0;
  const lastOrder = valid.length ? valid[valid.length - 1].created_at : null;
  const firstOrder = valid.length ? valid[0].created_at : null;
  let frequency = 0;
  if (firstOrder && lastOrder && ordersCount > 1) {
    const days = Math.max(1, (new Date(lastOrder).getTime() - new Date(firstOrder).getTime()) / 86400000);
    frequency = ordersCount / (days / 30);
  } else if (ordersCount === 1) {
    frequency = 1;
  }
  const purchased = [];
  for (const r of valid) {
    const parts = String(r.product_name || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const p of parts) if (!purchased.includes(p)) purchased.push(p);
  }
  try {
    await pool.query(
      `UPDATE customers SET orders_count = ?, total_spent = ?, avg_order_value = ?,
        purchase_frequency = ?, last_order_date = ?, purchased_products = ?
        WHERE LOWER(email) = ?`,
      [ordersCount, totalSpent.toFixed(2), avgOrderValue.toFixed(2), frequency.toFixed(2), lastOrder, JSON.stringify(purchased.slice(0, 100)), key]
    );
  } catch (err) {
    console.error('Warning: failed to refresh customer metrics:', err?.message || err);
  }
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

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [rows] = await pool.query(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC`, values);
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === 'admin';
    const normalized = rows.map(row => {
      const norm = normalizeOrderRow(row);
      if (!isSuperAdmin && norm) {
        norm.phone = norm.phone ? '********' : null;
      }
      return norm;
    });
    return res.json({ orders: normalized });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders' });
  }
});

ordersRoutes.post('/orders', async (req, res) => {
  try {
    const o = req.body || {};
    // TASK 04: validate inventory + price server-side before creating the order.
    // Payment failure must never create a falsely-paid order: reject paid statuses
    // that arrive without verification, and force them to pending.
    const requestedStatus = normalizeOrderStatus(o.status, 'pending');
    const paymentMethod = o.payment_method ? String(o.payment_method).toLowerCase() : null;
    if (['paid', 'completed', 'delivered'].includes(requestedStatus) && !req.user) {
      return res.status(400).json({
        success: false,
        error: 'New orders cannot be created as paid. The order will stay pending until payment is verified.',
      });
    }
    const validation = await validateOrderPricing(o);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.errors.join(' ') });
    }
    if (o.amount != null && validation.expectedTotal != null) {
      const claimed = Number(o.amount);
      // Allow tax/fees on top of the validated subtotal, but never a zero/negative total
      // for a purchasable cart, and never below the validated subtotal.
      if (!(claimed > 0) || claimed + 0.01 < validation.expectedTotal) {
        return res.status(400).json({
          success: false,
          error: `Order total L.E ${claimed} does not match validated price L.E ${validation.expectedTotal.toFixed(2)}.`,
        });
      }
    }
    const customerId = await upsertCustomerForOrder(o);
    const [result] = await pool.query(
      `INSERT INTO orders
       (order_number, customer_id, customer_name, customer_email, phone, preferred_platform, marketing_consent, product_name, date, status, amount,
        digital_email, digital_password, digital_code, digital_delivery, inventory_id,
        payment_method, payment_proof, shipping_address, cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.order_number,
        customerId || null,
        o.customer_name,
        o.customer_email || null,
        o.phone || null,
        o.preferred_platform ? String(o.preferred_platform).trim() || null : null,
        o.marketing_consent === true || o.marketing_consent === 1 || o.marketing_consent === '1' ? 1 : 0,
        o.product_name || null,
        o.date || null,
        requestedStatus,
        o.amount ?? null,
        o.digital_email || null,
        o.digital_password || null,
        o.digital_code || null,
        o.digital_delivery ? JSON.stringify(o.digital_delivery) : null,
        o.inventory_id || null,
        paymentMethod,
        o.payment_proof || null,
        o.shipping_address ? JSON.stringify(o.shipping_address) : null,
        (o.cost !== undefined && o.cost !== null && String(o.cost).trim() !== '') ? o.cost : (o.amount ?? null),
      ]
    );
    if (o.customer_email) {
      refreshCustomerMetrics(o.customer_email).catch((err) => console.error('Failed to refresh customer metrics:', err));
    }
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [result.insertId]);
    let orderObj = normalizeOrderRow(rows[0]);

    // Push the new order to every connected admin device immediately.
    publishNewOrder(orderObj, req.user ? 'admin' : 'website');

    // Auto-allocate immediately for digital products
    try {
      const [products] = await pool.query('SELECT id, name, digitalItems FROM products');
      const itemStrings = (orderObj.product_name || '').split(',').map(s => s.trim()).filter(Boolean);
      const deliveryDetails = [];
      const updatedProducts = new Map();

      for (const itemString of itemStrings) {
        const matchedProducts = products.filter(p => 
          itemString.toLowerCase().includes((p.name || '').toLowerCase()) ||
          (p.name || '').toLowerCase().includes(itemString.toLowerCase())
        );
        matchedProducts.sort((a, b) => (b.name || '').length - (a.name || '').length);
        const product = matchedProducts[0];

        if (!product) continue;

        const itemStringLower = itemString.toLowerCase();
        let selectedSlotName = '';
        if (itemStringLower.includes('primary ps5')) selectedSlotName = 'Primary PS5';
        else if (itemStringLower.includes('primary ps4')) selectedSlotName = 'Primary PS4';
        else if (itemStringLower.includes('primary')) selectedSlotName = 'Primary';
        else if (itemStringLower.includes('secondary')) selectedSlotName = 'Secondary';
        else if (itemStringLower.includes('offline ps5')) selectedSlotName = 'Offline PS5';
        else if (itemStringLower.includes('offline ps4')) selectedSlotName = 'Offline PS4';
        else if (itemStringLower.includes('offline')) selectedSlotName = 'Offline';
        else if (itemStringLower.includes('full account')) selectedSlotName = 'Full Account';

        if (!selectedSlotName) continue;

        let digitalItems = updatedProducts.has(product.id) 
          ? updatedProducts.get(product.id) 
          : (typeof product.digitalItems === 'string' ? JSON.parse(product.digitalItems) : (product.digitalItems || []));

        let assignedDI = null;
        let allocatedSlotKey = '';

        for (let di of digitalItems) {
          if (di.fullAccountSold) continue;
          if (!di.slots) continue;
          const keys = Object.keys(di.slots);
          
          const candidateKeys = keys.filter(k => 
            k.toLowerCase() === selectedSlotName.toLowerCase() ||
            k.toLowerCase().includes(selectedSlotName.toLowerCase()) ||
            selectedSlotName.toLowerCase().includes(k.toLowerCase())
          );
          
          let matchedKey = '';
          if (candidateKeys.length > 0) {
            const bestKey = candidateKeys.find(k => {
              const parts = k.toLowerCase().split(' - ');
              if (parts.length > 1) {
                const groupPrefix = parts[0].trim();
                return itemStringLower.includes(groupPrefix);
              }
              return false;
            });
            matchedKey = bestKey || candidateKeys[0];
          }

          if (matchedKey) {
            const slot = di.slots[matchedKey];
            if (slot && !slot.sold && slot.code) {
              // Full Account purchase: only available if NO individual slots have been sold
              const isFullAccount = matchedKey.toLowerCase().endsWith('full account');
              if (isFullAccount) {
                const anySlotSold = Object.values(di.slots).some(s => s && s.sold);
                if (anySlotSold) continue;
              }
              
              assignedDI = di;
              allocatedSlotKey = matchedKey;
              break;
            }
          }
        }

        if (assignedDI && allocatedSlotKey) {
          const isFullAccount = allocatedSlotKey.toLowerCase().endsWith('full account');
          if (isFullAccount) {
            assignedDI.fullAccountSold = true;
            Object.keys(assignedDI.slots).forEach(key => {
              assignedDI.slots[key].sold = true;
              assignedDI.slots[key].orderId = orderObj.order_number || orderObj.id;
              assignedDI.slots[key].customerName = orderObj.customer_name;
            });
          } else {
            assignedDI.slots[allocatedSlotKey].sold = true;
            assignedDI.slots[allocatedSlotKey].orderId = orderObj.order_number || orderObj.id;
            assignedDI.slots[allocatedSlotKey].customerName = orderObj.customer_name;
          }
          updatedProducts.set(product.id, digitalItems);
          deliveryDetails.push({
            name: itemString,
            digitalItemId: assignedDI.id || '',
            productId: product.id,
            email: assignedDI.email || '',
            password: assignedDI.password || '',
            code: assignedDI.slots[allocatedSlotKey].code || '',
            outlookEmail: assignedDI.outlookEmail || '',
            outlookPassword: assignedDI.outlookPassword || '',
            twoFactorCode: assignedDI.twoFactorCode || '',
            birthdate: assignedDI.birthdate || '',
            region: assignedDI.region || '',
            onlineId: assignedDI.onlineId || '',
            backupCodes: assignedDI.backupCodes || '',
            slotName: allocatedSlotKey,
            isFullAccount: allocatedSlotKey.toLowerCase().endsWith('full account'),
          });
        }
      }

      if (deliveryDetails.length > 0) {
        for (const [productId, digitalItems] of updatedProducts.entries()) {
          await pool.query('UPDATE products SET digitalItems = ? WHERE id = ?', [JSON.stringify(digitalItems), productId]);
        }
        await pool.query(
          `UPDATE orders SET digital_email = ?, digital_password = ?, digital_code = ?, digital_delivery = ? WHERE id = ?`,
          [deliveryDetails[0].email, deliveryDetails[0].password, deliveryDetails[0].code, JSON.stringify(deliveryDetails), orderObj.id]
        );
        // Refresh orderObj for email content
        const [refreshedRows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderObj.id]);
        orderObj = normalizeOrderRow(refreshedRows[0]);

        // Record the auditable per-account sale transactions for this allocation
        try {
          await insertAccountSalesForDelivery(pool, orderObj, deliveryDetails);
        } catch (saleErr) {
          console.error('Failed to record account sales for new order:', saleErr);
        }
      }
    } catch (allocErr) {
      console.error('Initial auto-allocation failed:', allocErr);
    }

    // Fire and forget email notifications
    (async () => {
      try {
        const adminHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #dc2626; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Order Alert: #${o.order_number}</h2>
            <p><strong>Customer:</strong> ${o.customer_name} (<a href="mailto:${o.customer_email}">${o.customer_email}</a>)</p>
            <p><strong>Phone:</strong> ${o.phone || 'N/A'}</p>
            <p><strong>Product:</strong> ${o.product_name || 'N/A'}</p>
            <p><strong>Amount:</strong> L.E ${o.amount || 0}</p>
            <p><strong>Payment Method:</strong> ${o.payment_method?.toUpperCase() || 'N/A'}</p>
            <div style="margin-top: 20px;">
              <a href="https://admin.games-up.co/orders" style="background: #dc2626; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Order in Admin Panel</a>
            </div>
          </div>
        `;

        const [adminUsers] = await pool.query("SELECT email FROM users WHERE role != 'customer' AND role IS NOT NULL AND email IS NOT NULL");
        const [employeeList] = await pool.query("SELECT email FROM employees WHERE email IS NOT NULL");
        
        const emailSet = new Set(adminUsers.map(u => u.email));
        employeeList.forEach(e => emailSet.add(e.email));
        emailSet.add('info@games-up.co');
        
        const adminEmails = Array.from(emailSet);

        for (const email of adminEmails) {
          await sendMailInternal({
            to: email,
            subject: `New Order: #${o.order_number}`,
            html: adminHtml
          }).catch(err => console.error(`Failed to send to ${email}:`, err));
        }

        if (o.customer_email) {
          const userHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #dc2626;">Thank you for your order!</h2>
              <p>Hi ${o.customer_name},</p>
              <p>Your order <strong>#${o.order_number}</strong> has been received successfully and is currently being processed by our team.</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Product</td><td style="padding: 8px; border: 1px solid #eee;">${o.product_name}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Total Amount</td><td style="padding: 8px; border: 1px solid #eee;">L.E ${o.amount}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Payment Method</td><td style="padding: 8px; border: 1px solid #eee;">${o.payment_method?.toUpperCase()}</td></tr>
              </table>
              <p style="margin-top: 20px;">If this was a digital product, your game account details will be delivered shortly.</p>
              <p>Thanks for choosing GamesUp!</p>
            </div>
          `;
          await sendMailInternal({
            to: o.customer_email,
            subject: `Order Confirmation: #${o.order_number}`,
            html: userHtml
          });
        }
      } catch (emailErr) {
        console.error('Failed to send order notification emails:', emailErr);
      }
    })();

    return res.json(orderObj);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create order' });
  }
});


ordersRoutes.post('/orders/:id/auto-allocate', requirePermission('orders', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orders.length) return res.status(404).json({ success: false, error: 'Order not found' });
    const order = orders[0];

    const [products] = await pool.query('SELECT id, name, digitalItems FROM products');
    
    // Split multi-item orders
    const itemStrings = (order.product_name || '').split(',').map(s => s.trim()).filter(Boolean);
    const deliveryDetails = [];
    const updatedProducts = new Map(); // Track product updates to save at the end

    for (const itemString of itemStrings) {
      // Find matching product for this specific item string
      const matchedProducts = products.filter(p => 
        itemString.toLowerCase().includes((p.name || '').toLowerCase()) ||
        (p.name || '').toLowerCase().includes(itemString.toLowerCase())
      );
      matchedProducts.sort((a, b) => (b.name || '').length - (a.name || '').length);
      const product = matchedProducts[0];

      if (!product) continue;

      const itemStringLower = itemString.toLowerCase();
      let selectedSlotName = '';
      
      if (itemStringLower.includes('primary ps5')) selectedSlotName = 'Primary PS5';
      else if (itemStringLower.includes('primary ps4')) selectedSlotName = 'Primary PS4';
      else if (itemStringLower.includes('primary')) selectedSlotName = 'Primary';
      else if (itemStringLower.includes('secondary')) selectedSlotName = 'Secondary';
      else if (itemStringLower.includes('offline ps5')) selectedSlotName = 'Offline PS5';
      else if (itemStringLower.includes('offline ps4')) selectedSlotName = 'Offline PS4';
      else if (itemStringLower.includes('offline')) selectedSlotName = 'Offline';
      else if (itemStringLower.includes('full account')) selectedSlotName = 'Full Account';

      if (!selectedSlotName) continue;

      // Get digitalItems (possibly already modified in this loop)
      let digitalItems = updatedProducts.has(product.id) 
        ? updatedProducts.get(product.id) 
        : (typeof product.digitalItems === 'string' ? JSON.parse(product.digitalItems) : (product.digitalItems || []));

      let assignedDI = null;
      let allocatedSlotKey = '';

      for (let di of digitalItems) {
        if (di.fullAccountSold) continue;
        if (!di.slots) continue;

        const keys = Object.keys(di.slots);
        const candidateKeys = keys.filter(k => 
          k.toLowerCase() === selectedSlotName.toLowerCase() ||
          k.toLowerCase().includes(selectedSlotName.toLowerCase()) ||
          selectedSlotName.toLowerCase().includes(k.toLowerCase())
        );

        let matchedKey = '';
        if (candidateKeys.length > 0) {
          const bestKey = candidateKeys.find(k => {
            const parts = k.toLowerCase().split(' - ');
            if (parts.length > 1) {
              const groupPrefix = parts[0].trim();
              return itemStringLower.includes(groupPrefix);
            }
            return false;
          });
          matchedKey = bestKey || candidateKeys[0];
        }

        if (matchedKey) {
          const slot = di.slots[matchedKey];
          if (slot && !slot.sold && slot.code) {
            // Full Account purchase: only available if NO individual slots have been sold
            const isFullAccount = matchedKey.toLowerCase().endsWith('full account');
            if (isFullAccount) {
              const anySlotSold = Object.values(di.slots).some(s => s && s.sold);
              if (anySlotSold) continue;
            }

            assignedDI = di;
            allocatedSlotKey = matchedKey;
            break;
          }
        }
      }

      if (assignedDI && allocatedSlotKey) {
        // Mark as sold
        const isFullAccount = allocatedSlotKey.toLowerCase().endsWith('full account');
        if (isFullAccount) {
          assignedDI.fullAccountSold = true;
          Object.keys(assignedDI.slots).forEach(key => {
            assignedDI.slots[key].sold = true;
            assignedDI.slots[key].orderId = order.order_number || order.id;
            assignedDI.slots[key].customerName = order.customer_name;
          });
        } else {
          assignedDI.slots[allocatedSlotKey].sold = true;
          assignedDI.slots[allocatedSlotKey].orderId = order.order_number || order.id;
          assignedDI.slots[allocatedSlotKey].customerName = order.customer_name;
        }

        updatedProducts.set(product.id, digitalItems);

        deliveryDetails.push({
          name: itemString,
          digitalItemId: assignedDI.id || '',
          productId: product.id,
          email: assignedDI.email || '',
          password: assignedDI.password || '',
          code: assignedDI.slots[allocatedSlotKey].code || '',
          outlookEmail: assignedDI.outlookEmail || '',
          outlookPassword: assignedDI.outlookPassword || '',
          twoFactorCode: assignedDI.twoFactorCode || '',
          birthdate: assignedDI.birthdate || '',
          region: assignedDI.region || '',
          onlineId: assignedDI.onlineId || '',
          backupCodes: assignedDI.backupCodes || '',
          slotName: allocatedSlotKey,
          isFullAccount: allocatedSlotKey.toLowerCase().endsWith('full account'),
        });
      }
    }

    if (deliveryDetails.length === 0) {
      return res.status(400).json({ success: false, error: 'No matching available inventory found for any items in this order' });
    }

    // Save all updated products
    for (const [productId, digitalItems] of updatedProducts.entries()) {
      await pool.query('UPDATE products SET digitalItems = ? WHERE id = ?', [JSON.stringify(digitalItems), productId]);
    }

    // Update order with ALL delivery details
    await pool.query(
      `UPDATE orders SET 
        digital_email = ?, 
        digital_password = ?, 
        digital_code = ?, 
        digital_delivery = ? 
       WHERE id = ?`,
      [
        deliveryDetails[0].email || '',
        deliveryDetails[0].password || '',
        deliveryDetails[0].code || '',
        JSON.stringify(deliveryDetails),
        id
      ]
    );

    // Record the auditable per-account sale transactions for this allocation
    try {
      const [freshOrderRows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
      if (freshOrderRows.length) {
        await insertAccountSalesForDelivery(pool, normalizeOrderRow(freshOrderRows[0]), deliveryDetails);
      }
    } catch (saleErr) {
      console.error('Failed to record account sales for auto-allocate:', saleErr);
    }

    return res.json({ success: true, message: `Successfully allocated ${deliveryDetails.length} items`, delivery: deliveryDetails });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

ordersRoutes.post('/orders/validate', async (req, res) => {
  try {
    const validation = await validateOrderPricing(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    return res.json({ success: true, expectedTotal: validation.expectedTotal });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Validation failed' });
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
    if (o.status !== undefined) setIfDefined('status', normalizeOrderStatus(o.status, o.status));
    setIfDefined('amount', o.amount);
    setIfDefined('digital_email', o.digital_email);
    setIfDefined('digital_password', o.digital_password);
    setIfDefined('digital_code', o.digital_code);
    if (o.digital_delivery !== undefined) setIfDefined('digital_delivery', o.digital_delivery ? JSON.stringify(o.digital_delivery) : null);
    setIfDefined('inventory_id', o.inventory_id);
    setIfDefined('payment_method', o.payment_method);
    setIfDefined('payment_proof', o.payment_proof);
    if (o.shipping_address !== undefined) setIfDefined('shipping_address', o.shipping_address ? JSON.stringify(o.shipping_address) : null);
    setIfDefined('cost', o.cost);

    if (updates.length) {
      values.push(id);
      await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    const norm = normalizeOrderRow(rows[0]);

    // Sync account_sales rows when an order moves to a converted or cancelled status.
    if (norm && o.status !== undefined) {
      try {
        await setOrderSaleStatus(pool, norm.id, norm.order_number, o.status);
      } catch (statusErr) {
        console.error('Failed to sync account sale status for order:', statusErr);
      }
      if (norm.customer_email) {
        refreshCustomerMetrics(norm.customer_email).catch((err) => console.error('Failed to refresh customer metrics:', err));
      }
    }

    if (req.user?.role !== 'admin' && norm) {
      norm.phone = norm.phone ? '********' : null;
    }
    // Let connected admin devices know the order moved (status/delivery change).
    publishOrderUpdate(norm, 'admin');
    return res.json(norm);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update order' });
  }
});

