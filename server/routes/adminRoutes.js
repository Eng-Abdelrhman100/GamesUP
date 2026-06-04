import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const adminRoutes = Router();

function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
}

async function getSettingNumber(key, fallback) {
  const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [key]);
  if (!rows.length) return fallback;
  const raw = rows[0].setting_value;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function computePeriodDates(timeRange) {
  const now = new Date();
  const start = new Date(now);
  const prevStart = new Date(now);
  const prevEnd = new Date(now);

  switch (timeRange) {
    case 'daily':
    case '1day':
      start.setDate(now.getDate() - 1);
      prevStart.setDate(now.getDate() - 2);
      prevEnd.setDate(now.getDate() - 1);
      break;
    case 'weekly':
    case '7days':
      start.setDate(now.getDate() - 7);
      prevStart.setDate(now.getDate() - 14);
      prevEnd.setDate(now.getDate() - 7);
      break;
    case 'monthly':
    case '30days':
      start.setDate(now.getDate() - 30);
      prevStart.setDate(now.getDate() - 60);
      prevEnd.setDate(now.getDate() - 30);
      break;
    case '3months':
      start.setMonth(now.getMonth() - 3);
      prevStart.setMonth(now.getMonth() - 6);
      prevEnd.setMonth(now.getMonth() - 3);
      break;
    case '12months':
    default:
      start.setFullYear(now.getFullYear() - 1);
      prevStart.setFullYear(now.getFullYear() - 2);
      prevEnd.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { now, start, prevStart, prevEnd };
}

function getBucketKey(date, timeRange) {
  const dt = new Date(date);
  if (timeRange === '12months' || timeRange === '3months') return dt.toISOString().slice(0, 7);
  if (timeRange === 'daily' || timeRange === '1day') return dt.toISOString().slice(0, 13);
  return dt.toISOString().slice(0, 10);
}

function buildTrafficColors(names) {
  const palette = ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FB7185', '#FDA4AF'];
  return names.map((name, idx) => ({ name, color: palette[idx % palette.length] }));
}

adminRoutes.get('/admin/dashboard', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const timeRange = req.query.timeRange ? String(req.query.timeRange) : '30days';
      const category = req.query.category ? String(req.query.category) : null;
      const { start, prevStart, prevEnd } = computePeriodDates(timeRange);

      const convertedStatuses = new Set(['completed', 'delivered', 'paid']);
      const marginRate = await getSettingNumber('profit_margin_rate', 0.2);

      const params = [toSqlDateTime(start)];
      let categorySql = '';
      if (category) {
        categorySql = ' AND p.category_slug = ?';
        params.push(category);
      }

      const [ordersRows] = await pool.query(
        `SELECT o.amount, o.status, o.created_at, o.customer_email, o.customer_name, o.order_number, o.product_name, o.payment_method,
                p.id AS product_id, p.image AS product_image, p.category_slug
         FROM orders o
         LEFT JOIN products p ON p.name = o.product_name
         WHERE o.created_at >= ?${categorySql}
         ORDER BY o.created_at DESC`,
        params
      );

      const [prevRows] = await pool.query(
        `SELECT o.amount, o.status, o.created_at, o.customer_email
         FROM orders o
         LEFT JOIN products p ON p.name = o.product_name
         WHERE o.created_at >= ?
           AND o.created_at < ?${categorySql}`,
        [toSqlDateTime(prevStart), toSqlDateTime(prevEnd), ...(category ? [category] : [])]
      );

      const totalOrdersAll = ordersRows.length;
      const convertedOrders = ordersRows.filter((o) => convertedStatuses.has(String(o.status || '').toLowerCase()));
      const totalRevenue = convertedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const totalProfit = totalRevenue * marginRate;

      const customerSet = new Set();
      for (const o of ordersRows) {
        if (o.customer_email) customerSet.add(String(o.customer_email).toLowerCase());
      }
      const activeCustomers = customerSet.size;

      const conversionRate = totalOrdersAll > 0 ? (convertedOrders.length / totalOrdersAll) * 100 : 0;

      const prevTotal = prevRows.length;
      const prevConverted = prevRows.filter((o) => convertedStatuses.has(String(o.status || '').toLowerCase()));
      const prevRevenue = prevConverted.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const prevProfit = prevRevenue * marginRate;
      const prevCustomerSet = new Set();
      for (const o of prevRows) {
        if (o.customer_email) prevCustomerSet.add(String(o.customer_email).toLowerCase());
      }
      const prevCustomers = prevCustomerSet.size;
      const prevConversionRate = prevTotal > 0 ? (prevConverted.length / prevTotal) * 100 : 0;

      const buckets = new Map();
      for (const o of ordersRows) {
        const key = getBucketKey(o.created_at, timeRange);
        if (!buckets.has(key)) buckets.set(key, { key, total: 0, converted: 0, revenue: 0, customers: new Set() });
        const b = buckets.get(key);
        b.total += 1;
        if (o.customer_email) b.customers.add(String(o.customer_email).toLowerCase());
        if (convertedStatuses.has(String(o.status || '').toLowerCase())) {
          b.converted += 1;
          b.revenue += Number(o.amount) || 0;
        }
      }

      const productSales = Array.from(buckets.values())
        .sort((a, b) => String(a.key).localeCompare(String(b.key)))
        .map((b) => ({
          month: b.key,
          sales: b.converted,
          earning: b.revenue,
        }));

      const revenueSpark = productSales.map((p) => ({ sales: p.earning }));
      const customersSpark = Array.from(buckets.values())
        .sort((a, b) => String(a.key).localeCompare(String(b.key)))
        .map((b) => ({ sales: b.customers.size }));
      const conversionSpark = Array.from(buckets.values())
        .sort((a, b) => String(a.key).localeCompare(String(b.key)))
        .map((b) => ({ sales: b.total > 0 ? (b.converted / b.total) * 100 : 0 }));
      const ordersSpark = productSales.map((p) => ({ value: p.sales }));

      const paymentMap = new Map();
      for (const o of convertedOrders) {
        const name = o.payment_method ? String(o.payment_method) : 'Unknown';
        paymentMap.set(name, (paymentMap.get(name) || 0) + (Number(o.amount) || 0));
      }
      const paymentEntries = Array.from(paymentMap.entries()).sort((a, b) => b[1] - a[1]);
      const trafficNames = paymentEntries.map(([name]) => name);
      const colors = new Map(buildTrafficColors(trafficNames).map((x) => [x.name, x.color]));
      const trafficTotal = paymentEntries.reduce((sum, [, v]) => sum + v, 0);
      const trafficData = paymentEntries.map(([name, revenue]) => ({
        name,
        value: trafficTotal > 0 ? Math.round((revenue / trafficTotal) * 100) : 0,
        color: colors.get(name) || '#DC2626',
      }));

      const [topProductsRows] = await pool.query(
        `SELECT o.product_name AS name,
                COUNT(*) AS sales,
                SUM(o.amount) AS revenue,
                MAX(p.image) AS image,
                MIN(p.id) AS id
         FROM orders o
         LEFT JOIN products p ON p.name = o.product_name
         WHERE o.created_at >= ?${categorySql}
           AND o.status IN ('completed', 'delivered', 'paid')
         GROUP BY o.product_name
         ORDER BY revenue DESC
         LIMIT 4`,
        params
      );

      const topProducts = (topProductsRows || []).map((r) => ({
        id: r.id || r.name,
        name: r.name || 'Unknown',
        sales: Number(r.sales) || 0,
        revenue: Number(r.revenue) || 0,
        image: r.image || '/placeholder-image.png',
      }));

      const [recentOrdersRows] = await pool.query(
        `SELECT o.order_number, o.customer_name, o.product_name, o.status, o.amount, o.created_at
         FROM orders o
         ORDER BY o.created_at DESC
         LIMIT 5`
      );

      const recentOrders = (recentOrdersRows || []).map((o) => ({
        id: o.order_number,
        customer: o.customer_name,
        product: o.product_name,
        status: o.status,
        amount: Number(o.amount) || 0,
        date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }));

      const [categoryRows] = await pool.query(
        'SELECT slug, name FROM categories WHERE is_active = TRUE ORDER BY display_order ASC'
      );

      let gameRequests = [];
      try {
        const [reqRows] = await pool.query(
          `SELECT id, title, region, account_type, status, created_at
           FROM game_requests
           ORDER BY created_at DESC, id DESC
           LIMIT 6`
        );
        gameRequests = reqRows || [];
      } catch (e) {
        gameRequests = [];
      }

      return res.json({
        kpis: {
          revenue: totalRevenue,
          profit: totalProfit,
          orders: totalOrdersAll,
          activeCustomers,
          conversionRate,
        },
        deltas: {
          revenuePct: pctChange(totalRevenue, prevRevenue),
          profitPct: pctChange(totalProfit, prevProfit),
          ordersPct: pctChange(totalOrdersAll, prevTotal),
          activeCustomersPct: pctChange(activeCustomers, prevCustomers),
          conversionRatePct: pctChange(conversionRate, prevConversionRate),
        },
        charts: {
          productSales,
          revenueSpark,
          ordersSpark,
          customersSpark,
          conversionSpark,
        },
        trafficData,
        topProducts,
        recentOrders,
        gameRequests,
        categories: categoryRows || [],
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to load dashboard' });
    }
  });
});

adminRoutes.get('/admin/users', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const [rows] = await pool.query(
        `SELECT id, email, name, role, permissions, job_title, phone, avatar, identity_document, created_at
         FROM users
         WHERE role != 'customer' AND role IS NOT NULL
         ORDER BY id DESC`
      );
      const normalized = rows.map((u) => {
        let permissions = null;
        if (u.permissions) {
          if (typeof u.permissions === 'string') {
            try {
              permissions = JSON.parse(u.permissions);
            } catch {
              permissions = null;
            }
          } else {
            permissions = u.permissions;
          }
        }
        return { ...u, permissions };
      });
      return res.json(normalized);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch users' });
    }
  });
});

adminRoutes.post('/admin/users', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const u = req.body || {};
      const normalizedEmail = String(u.email || '').trim().toLowerCase();
      if (!normalizedEmail || !u.password || !u.name) {
        return res.status(400).json({ success: false, error: 'name, email, password are required' });
      }

      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (existing.length) return res.status(409).json({ success: false, error: 'User already registered' });

      const hash = await bcrypt.hash(u.password, 10);
      const role = String(u.role || 'staff').trim().toLowerCase();
      const permissionsJson = u.permissions ? JSON.stringify(u.permissions) : null;
      const department = u.department || u.job_title || 'General';

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [userResult] = await conn.query(
          'INSERT INTO users (email, password_hash, name, role, permissions, phone, avatar, job_title, identity_document) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            normalizedEmail,
            hash,
            u.name,
            role,
            permissionsJson,
            u.phone || null,
            u.avatar || null,
            u.job_title || null,
            u.identity_document || null,
          ]
        );

        await conn.query(
          'INSERT INTO employees (name, email, role, department, phone, image, status, join_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            u.name,
            normalizedEmail,
            role,
            department,
            u.phone || null,
            u.avatar || null,
            'Active',
            new Date().toISOString().split('T')[0],
          ]
        );

        await conn.commit();
        return res.json({ success: true, userId: userResult.insertId });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create admin user' });
    }
  });
});

adminRoutes.put('/admin/users/:id', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const id = req.params.id;
      const input = req.body || {};
      const [rows] = await pool.query('SELECT id, email FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });

      const currentEmail = String(rows[0].email || '').trim().toLowerCase();
      const nextEmail = input.email ? String(input.email).trim().toLowerCase() : currentEmail;
      const nextRole = input.role ? String(input.role).trim().toLowerCase() : undefined;
      const permissionsJson = input.permissions === undefined ? undefined : JSON.stringify(input.permissions);
      const nextDepartment = input.department || input.job_title || undefined;

      if (nextEmail !== currentEmail) {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [nextEmail, id]);
        if (existing.length) return res.status(409).json({ success: false, error: 'Email already in use' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        if (input.password) {
          const hash = await bcrypt.hash(String(input.password), 10);
          await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
        }

        await conn.query(
          `UPDATE users
           SET email = ?,
               name = COALESCE(?, name),
               role = COALESCE(?, role),
               permissions = COALESCE(?, permissions),
               job_title = COALESCE(?, job_title),
               phone = COALESCE(?, phone),
               avatar = COALESCE(?, avatar),
               identity_document = COALESCE(?, identity_document)
           WHERE id = ?`,
          [
            nextEmail,
            input.name ?? null,
            nextRole ?? null,
            permissionsJson ?? null,
            input.job_title ?? null,
            input.phone ?? null,
            input.avatar ?? null,
            input.identity_document ?? null,
            id,
          ]
        );

        await conn.query(
          `UPDATE employees
           SET email = ?,
               name = COALESCE(?, name),
               role = COALESCE(?, role),
               department = COALESCE(?, department),
               phone = COALESCE(?, phone),
               image = COALESCE(?, image)
           WHERE email = ?`,
          [
            nextEmail,
            input.name ?? null,
            nextRole ?? null,
            nextDepartment ?? null,
            input.phone ?? null,
            input.avatar ?? null,
            currentEmail,
          ]
        );

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      const [after] = await pool.query(
        'SELECT id, email, name, role, permissions, job_title, phone, avatar, identity_document, created_at FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      const u = after[0];
      let permissions = null;
      if (u.permissions) {
        if (typeof u.permissions === 'string') {
          try {
            permissions = JSON.parse(u.permissions);
          } catch {
            permissions = null;
          }
        } else {
          permissions = u.permissions;
        }
      }
      return res.json({ ...u, permissions });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update user' });
    }
  });
});

adminRoutes.delete('/admin/users/:id', async (req, res) => {
  return requireRoles(['admin'])(req, res, async () => {
    try {
      const id = req.params.id;
      const [rows] = await pool.query('SELECT id, email FROM users WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.json({ success: true });

      const email = String(rows[0].email || '').trim().toLowerCase();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM employees WHERE email = ?', [email]);
        await conn.query('DELETE FROM users WHERE id = ?', [id]);
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete user' });
    }
  });
});

adminRoutes.get('/admin/sold-products', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const [rows] = await pool.query("SELECT * FROM orders WHERE status = 'completed'");
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch sold products' });
    }
  });
});

adminRoutes.get('/admin/analytics', async (req, res) => {
  return requireRoles(['admin', 'manager'])(req, res, async () => {
    try {
      const timeRange = req.query.timeRange ? String(req.query.timeRange) : '12months';
      const now = new Date();
      const startDate = new Date(now);
      const prevStartDate = new Date(now);
      const prevEndDate = new Date(now);
      switch (timeRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          prevStartDate.setDate(now.getDate() - 14);
          prevEndDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          prevStartDate.setDate(now.getDate() - 60);
          prevEndDate.setDate(now.getDate() - 30);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          prevStartDate.setMonth(now.getMonth() - 6);
          prevEndDate.setMonth(now.getMonth() - 3);
          break;
        case '12months':
        default:
          startDate.setFullYear(now.getFullYear() - 1);
          prevStartDate.setFullYear(now.getFullYear() - 2);
          prevEndDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const marginRate = await getSettingNumber('profit_margin_rate', 0.2);

      const [rows] = await pool.query(
        `SELECT amount, product_name, created_at, shipping_address FROM orders
         WHERE created_at >= ?
           AND status IN ('completed', 'delivered', 'paid')`,
        [toSqlDateTime(startDate)]
      );

      const completedOrders = rows || [];
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
      const totalOrders = completedOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalProfit = totalRevenue * marginRate;

      const [prevRows] = await pool.query(
        `SELECT amount FROM orders
         WHERE created_at >= ?
           AND created_at < ?
           AND status IN ('completed', 'delivered', 'paid')`,
        [toSqlDateTime(prevStartDate), toSqlDateTime(prevEndDate)]
      );

      const prevOrders = prevRows || [];
      const prevRevenue = prevOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
      const prevCount = prevOrders.length;
      const prevAvgOrderValue = prevCount > 0 ? prevRevenue / prevCount : 0;
      const prevProfit = prevRevenue * marginRate;

      const groupByMonth = timeRange === '3months' || timeRange === '12months';
      const revenueMap = new Map();
      const orderCountMap = new Map();
      for (const order of completedOrders) {
        const dt = new Date(order.created_at);
        const key = groupByMonth ? dt.toISOString().slice(0, 7) : dt.toISOString().slice(0, 10);
        revenueMap.set(key, (revenueMap.get(key) || 0) + (Number(order.amount) || 0));
        orderCountMap.set(key, (orderCountMap.get(key) || 0) + 1);
      }

      const revenueData = Array.from(revenueMap.entries())
        .map(([key, amount]) => ({
          month: key,
          revenue: amount,
          profit: amount * marginRate,
          orders: orderCountMap.get(key) || 0,
        }))
        .sort((a, b) => String(a.month).localeCompare(String(b.month)));

      const productMap = new Map();
      for (const order of completedOrders) {
        const name = order.product_name || 'Unknown';
        productMap.set(name, (productMap.get(name) || 0) + 1);
      }

      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const categoryData = Array.from(productMap.entries())
        .map(([name, count], index) => ({
          name,
          value: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
          color: colors[index % colors.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const regionRevenue = new Map();
      for (const order of completedOrders) {
        let shipping = order.shipping_address;
        if (typeof shipping === 'string') {
          try {
            shipping = JSON.parse(shipping);
          } catch {
            shipping = null;
          }
        }
        const region =
          shipping?.country ||
          shipping?.state ||
          shipping?.city ||
          shipping?.region ||
          'Other';
        regionRevenue.set(region, (regionRevenue.get(region) || 0) + (Number(order.amount) || 0));
      }

      const regionList = Array.from(regionRevenue.entries())
        .map(([region, revenue]) => ({ region, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const top = regionList.slice(0, 4);
      const topSum = top.reduce((sum, r) => sum + r.revenue, 0);
      const otherSum = regionList.slice(4).reduce((sum, r) => sum + r.revenue, 0);
      const topRegions = [
        ...top.map((r) => ({
          region: r.region,
          revenue: r.revenue,
          percent: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
        })),
        ...(otherSum > 0
          ? [
              {
                region: 'Other',
                revenue: otherSum,
                percent: totalRevenue > 0 ? (otherSum / totalRevenue) * 100 : 0,
              },
            ]
          : []),
      ];

      return res.json({
        revenueData,
        categoryData,
        topRegions,
        totals: {
          revenue: totalRevenue,
          profit: totalProfit,
          avgOrderValue,
        },
        deltas: {
          revenuePct: pctChange(totalRevenue, prevRevenue),
          profitPct: pctChange(totalProfit, prevProfit),
          avgOrderValuePct: pctChange(avgOrderValue, prevAvgOrderValue),
        },
      });
    } catch (err) {
      return res.status(500).json({
        revenueData: [],
        categoryData: [],
        topRegions: [],
        totals: { revenue: 0, profit: 0, avgOrderValue: 0 },
        deltas: { revenuePct: 0, profitPct: 0, avgOrderValuePct: 0 },
      });
    }
  });
});
