import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles, requirePermission } from '../middleware/authMiddleware.js';
import { sendMailInternal } from '../controllers/emailController.js';

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
    const [result] = await pool.query(
      `INSERT INTO orders
       (order_number, customer_name, customer_email, phone, product_name, date, status, amount,
        digital_email, digital_password, digital_code, digital_delivery, inventory_id,
        payment_method, payment_proof, shipping_address, cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        (o.cost !== undefined && o.cost !== null && String(o.cost).trim() !== '') ? o.cost : (o.amount ?? null),
      ]
    );
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [result.insertId]);
    let orderObj = normalizeOrderRow(rows[0]);

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
          const matchedKey = keys.find(k => 
            k.toLowerCase() === selectedSlotName.toLowerCase() ||
            k.toLowerCase().includes(selectedSlotName.toLowerCase()) ||
            selectedSlotName.toLowerCase().includes(k.toLowerCase())
          );
          if (matchedKey) {
            const slot = di.slots[matchedKey];
            if (slot && !slot.sold && slot.code) {
              assignedDI = di;
              allocatedSlotKey = matchedKey;
              break;
            }
          }
        }

        if (assignedDI && allocatedSlotKey) {
          assignedDI.slots[allocatedSlotKey].sold = true;
          assignedDI.slots[allocatedSlotKey].orderId = orderObj.order_number || orderObj.id;
          assignedDI.slots[allocatedSlotKey].customerName = orderObj.customer_name;
          updatedProducts.set(product.id, digitalItems);
          deliveryDetails.push({
            name: itemString,
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
            slotName: allocatedSlotKey
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
        const matchedKey = keys.find(k => 
          k.toLowerCase() === selectedSlotName.toLowerCase() ||
          k.toLowerCase().includes(selectedSlotName.toLowerCase()) ||
          selectedSlotName.toLowerCase().includes(k.toLowerCase())
        );

        if (matchedKey) {
          const slot = di.slots[matchedKey];
          if (slot && !slot.sold && slot.code) {
            assignedDI = di;
            allocatedSlotKey = matchedKey;
            break;
          }
        }
      }

      if (assignedDI && allocatedSlotKey) {
        // Mark as sold
        assignedDI.slots[allocatedSlotKey].sold = true;
        assignedDI.slots[allocatedSlotKey].orderId = order.order_number || order.id;
        assignedDI.slots[allocatedSlotKey].customerName = order.customer_name;

        updatedProducts.set(product.id, digitalItems);

        deliveryDetails.push({
          name: itemString,
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
          slotName: allocatedSlotKey
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

    return res.json({ success: true, message: `Successfully allocated ${deliveryDetails.length} items`, delivery: deliveryDetails });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
    setIfDefined('cost', o.cost);

    if (updates.length) {
      values.push(id);
      await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    const norm = normalizeOrderRow(rows[0]);
    if (req.user?.role !== 'admin' && norm) {
      norm.phone = norm.phone ? '********' : null;
    }
    return res.json(norm);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update order' });
  }
});

