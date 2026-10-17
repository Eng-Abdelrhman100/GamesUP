import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';

export const accountFinanceRoutes = Router();

const ADMIN_ROLES = ['admin', 'manager'];

// Validate + normalize an acquisition type.
function normalizeAcquisitionType(type) {
  const t = String(type || '').trim().toLowerCase();
  if (t === 'purchased' || t === 'purchased account' || t === 'purchased_account') return 'purchased';
  if (t === 'created_from_balance' || t === 'created from balance') return 'created_from_balance';
  if (t === 'legacy') return 'legacy';
  return 'unknown';
}

// Upsert account_costs rows for many digital items of one product.
// Uses INSERT ... ON DUPLICATE KEY UPDATE so re-saving an import is idempotent.
export async function upsertAccountCosts(conn, productId, items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const values = [];
  const placeholders = [];
  for (const it of items) {
    if (!it || !it.id) continue;
    const acquisitionType = normalizeAcquisitionType(it.acquisitionType);
    // Legacy/Unknown never get a silently-assumed cost; explicit costs may be 0.
    const hasCost = it.acquisitionCost !== undefined && it.acquisitionCost !== null && String(it.acquisitionCost).trim() !== '';
    const acquisitionCost = (acquisitionType === 'purchased' || acquisitionType === 'created_from_balance') && hasCost
      ? parseFloat(String(it.acquisitionCost))
      : null;
    const sourceBalanceId = it.sourceBalanceId !== undefined && it.sourceBalanceId !== null ? it.sourceBalanceId : null;
    const sourceBalanceEmail = it.sourceBalanceEmail || null;
    const referenceNote = it.referenceNote || null;
    values.push(
      productId, String(it.id), acquisitionType, acquisitionCost,
      sourceBalanceId, sourceBalanceEmail, referenceNote
    );
    placeholders.push('(?, ?, ?, ?, ?, ?, ?)');
  }
  if (placeholders.length === 0) return 0;

  await conn.query(
    `INSERT INTO account_costs
      (product_id, digital_item_id, acquisition_type, acquisition_cost,
       source_balance_id, source_balance_email, reference_note)
     VALUES ${placeholders.join(', ')}
     ON DUPLICATE KEY UPDATE
       acquisition_type = VALUES(acquisition_type),
       acquisition_cost = VALUES(acquisition_cost),
       source_balance_id = VALUES(source_balance_id),
       source_balance_email = VALUES(source_balance_email),
       reference_note = VALUES(reference_note)`,
    values
  );
  return placeholders.length;
}

// Insert account_sales rows for an order's allocated digital delivery.
// Each delivery detail maps to one account (digital_item_id) + slot; the sale price
// is that line item's share of the order amount. Idempotent via uq_account_sale_ref.
// Sale rows are only 'active' (counted as revenue) once the order is converted;
// otherwise they are recorded as 'pending' and flipped by the order status update.
const CONVERTED_ORDER_STATUSES = new Set(['completed', 'delivered', 'paid']);
export function isConvertedOrderStatus(status) {
  return CONVERTED_ORDER_STATUSES.has(String(status || '').toLowerCase());
}

export async function insertAccountSalesForDelivery(conn, order, deliveryDetails) {
  if (!Array.isArray(deliveryDetails) || deliveryDetails.length === 0) return 0;

  const orderNumber = order.order_number || order.id;
  const orderId = order.id != null ? order.id : null;
  const totalAmount = Number(order.amount) || 0;
  const lineCount = deliveryDetails.length;
  const saleStatus = isConvertedOrderStatus(order.status) ? 'active' : 'pending';

  // Map order_number => numeric DB id for buyer/order linkage lookups.
  let orderDbId = orderId;
  if (orderDbId == null) {
    const [found] = await conn.query('SELECT id FROM orders WHERE order_number = ? LIMIT 1', [orderNumber]);
    orderDbId = found?.[0]?.id ?? null;
  }

  const buyerName = order.customer_name || null;
  const buyerEmail = order.customer_email || null;
  const saleDate = order.created_at || order.date || new Date();

  const values = [];
  const placeholders = [];
  for (const d of deliveryDetails) {
    const digitalItemId = d.digitalItemId || d.id || null;
    const slotName = d.slotName || d.slot || 'Full Account';
    if (!digitalItemId) continue;

    const isFullAccount = !!(d.isFullAccount) || String(slotName).toLowerCase().includes('full account');
    const productId = d.productId || d.product_id || null;
    if (!productId) continue;

    const share = lineCount > 0 ? Math.round((totalAmount / lineCount) * 100) / 100 : null;
    const saleId = d.accountSaleId || `${orderNumber}-${productId}-${digitalItemId}-${slotName}`.slice(0, 36);

    values.push(
      saleId, productId, digitalItemId, slotName, orderDbId, String(orderNumber),
      buyerName, buyerEmail, share, saleDate, saleStatus, isFullAccount ? 1 : 0
    );
    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  }
  if (placeholders.length === 0) return 0;

  await conn.query(
    `INSERT IGNORE INTO account_sales
      (account_sale_id, product_id, digital_item_id, slot_name, order_id, order_number,
       buyer_name, buyer_email, sale_price, sale_date, status, is_full_account)
     VALUES ${placeholders.join(', ')}`,
    values
  );
  return placeholders.length;
}

// Mark all sale rows for an order as active (converted) or cancelled.
export async function setOrderSaleStatus(conn, orderId, orderNumber, newStatus) {
  if (!orderId && !orderNumber) return;
  if (isConvertedOrderStatus(newStatus)) {
    const where = [];
    const params = [];
    if (orderId) { where.push('order_id = ?'); params.push(orderId); }
    if (orderNumber) { where.push('order_number = ?'); params.push(String(orderNumber)); }
    await conn.query(`UPDATE account_sales SET status = 'active' WHERE ${where.join(' OR ')}`, params);
  } else if (String(newStatus).toLowerCase() === 'cancelled') {
    const where = [];
    const params = [];
    if (orderId) { where.push('order_id = ?'); params.push(orderId); }
    if (orderNumber) { where.push('order_number = ?'); params.push(String(orderNumber)); }
    await conn.query(`UPDATE account_sales SET status = 'cancelled' WHERE ${where.join(' OR ')}`, params);
  }
}

// GET /api/account-finance/costs?productId= — acquisition cost rows (admin/manager only)
accountFinanceRoutes.get('/account-finance/costs', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  try {
    const { productId } = req.query;
    let rows;
    if (productId) {
      [rows] = await pool.query('SELECT * FROM account_costs WHERE product_id = ?', [productId]);
    } else {
      [rows] = await pool.query('SELECT * FROM account_costs');
    }
    return res.json({ success: true, items: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/account-finance/costs — bulk upsert cost basis
accountFinanceRoutes.post('/account-finance/costs', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  const { productId, items } = req.body || {};
  if (!productId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'productId and items[] are required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const count = await upsertAccountCosts(conn, productId, items);
    await conn.commit();
    return res.json({ success: true, count });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/account-finance/item/:productId/:digitalItemId — full per-account financial detail
accountFinanceRoutes.get('/account-finance/item/:productId/:digitalItemId', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  try {
    const { productId, digitalItemId } = req.params;
    const [products] = await pool.query('SELECT id, name, digitalItems FROM products WHERE id = ? LIMIT 1', [productId]);
    if (!products.length) return res.status(404).json({ success: false, error: 'Product not found' });

    let digitalItems = [];
    try {
      digitalItems = typeof products[0].digitalItems === 'string' ? JSON.parse(products[0].digitalItems) : (products[0].digitalItems || []);
    } catch { /* fall through */ }
    const account = (digitalItems || []).find((d) => d && String(d.id) === String(digitalItemId)) || null;

    const [costRows] = await pool.query(
      'SELECT * FROM account_costs WHERE product_id = ? AND digital_item_id = ? LIMIT 1',
      [productId, digitalItemId]
    );
    const cost = costRows[0] || null;

    const [sales] = await pool.query(
      `SELECT s.*, o.customer_email AS order_customer_email, o.order_number AS order_number_lookup
       FROM account_sales s
       LEFT JOIN orders o ON o.id = s.order_id
       WHERE s.product_id = ? AND s.digital_item_id = ? AND s.status = 'active'
       ORDER BY s.sale_date IS NULL, s.sale_date ASC, s.id ASC`,
      [productId, digitalItemId]
    );

    const totalRevenue = (sales || []).reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);
    const acquisitionCost = cost && cost.acquisition_cost != null ? Number(cost.acquisition_cost) : null;
    const totalProfit = acquisitionCost != null ? Math.round((totalRevenue - acquisitionCost) * 100) / 100 : null;
    const profitMargin = totalRevenue > 0 && totalProfit != null
      ? Math.round((totalProfit / totalRevenue) * 1000) / 10
      : null;

    return res.json({
      success: true,
      item: {
        product_id: productId,
        product_name: products[0].name,
        account,
        cost,
        sales,
        totals: {
          salesCount: (sales || []).length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          acquisitionCost,
          totalProfit,
          profitMargin,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/account-finance/balance-usage — record funds drawn from a balance source
accountFinanceRoutes.post('/account-finance/balance-usage', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  const {
    balanceId, productId, digitalItemIds, costPerAccount, quantity, amountUsed,
    deductFromBalance,
  } = req.body || {};
  if (!balanceId || !Array.isArray(digitalItemIds) || digitalItemIds.length === 0) {
    return res.status(400).json({ success: false, error: 'balanceId and digitalItemIds[] are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [balanceRows] = await pool.query('SELECT * FROM balance_inventory WHERE id = ? LIMIT 1', [balanceId]);
    if (!balanceRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Balance inventory source not found' });
    }
    const balance = balanceRows[0];
    const qty = quantity != null ? Number(quantity) : digitalItemIds.length;
    const perAccount = costPerAccount != null ? Number(costPerAccount) : null;
    const used = amountUsed != null ? Number(amountUsed) : (perAccount != null ? Math.round(perAccount * qty * 100) / 100 : null);

    // Persist cost rows for every created account against this balance source.
    const costItems = digitalItemIds.map((did) => ({
      id: did,
      acquisitionType: 'created_from_balance',
      acquisitionCost: perAccount,
      sourceBalanceId: balanceId,
      sourceBalanceEmail: balance.email || null,
      referenceNote: `Created from balance ${balance.email || '#' + balanceId}`,
    }));
    await upsertAccountCosts(conn, productId, costItems);

    await conn.query(
      `INSERT INTO balance_usage
        (balance_id, balance_email, product_id, digital_item_id, quantity, amount_used, cost_per_account, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [balanceId, balance.email || null, productId || null, digitalItemIds[0] || null,
       qty, used, perAccount, req.user?.id ?? null]
    );

    // Record usage rather than hard-deducting, per approved plan; optional decrement stays possible.
    if (deductFromBalance && used != null) {
      const currentBalance = Number(balance.dollar_balance) || 0;
      await conn.query('UPDATE balance_inventory SET dollar_balance = ? WHERE id = ?', [Math.max(0, Math.round((currentBalance - used) * 100) / 100), balanceId]);
    }

    await conn.commit();
    return res.status(201).json({ success: true, quantity: qty, amountUsed: used });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/account-finance/dashboard — aggregated profitability (Task 8)
accountFinanceRoutes.get('/account-finance/dashboard', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  try {
    const { productId, type, from, to } = req.query;

    const where = [];
    const params = [];
    if (productId) {
      where.push('p.id = ?');
      params.push(productId);
    }
    if (type) {
      where.push('c.acquisition_type = ?');
      params.push(normalizeAcquisitionType(type));
    }
    if (from) {
      where.push('c.created_at >= ?');
      params.push(new Date(String(from)));
    }
    if (to) {
      where.push('c.created_at <= ?');
      params.push(new Date(String(to)));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Cost-side aggregates
    const [costAgg] = await pool.query(
      `SELECT
         c.acquisition_type,
         COUNT(*) AS total_accounts,
         SUM(CASE WHEN c.acquisition_cost IS NOT NULL THEN c.acquisition_cost ELSE 0 END) AS total_acquisition_cost
       FROM account_costs c
       LEFT JOIN products p ON p.id = c.product_id
       ${whereSql}
       GROUP BY c.acquisition_type`,
      params
    );

    // Revenue-side aggregates (unfiltered). Profit is computed separately so each
    // account's acquisition cost is counted once, not once per sale row.
    const [salesAgg] = await pool.query(
      `SELECT
         COUNT(*) AS total_sales,
         COALESCE(SUM(s.sale_price), 0) AS total_sales_revenue
       FROM account_sales s
       WHERE s.status = 'active'`,
      []
    );

    // Cost basis of the distinct accounts that have at least one active sale.
    const [soldCostAgg] = await pool.query(
      `SELECT COALESCE(SUM(c.acquisition_cost), 0) AS total_cost_of_sold
       FROM (
         SELECT c2.digital_item_id, c2.product_id, c2.acquisition_cost
         FROM account_sales s2
         INNER JOIN account_costs c2 ON c2.product_id = s2.product_id AND c2.digital_item_id = s2.digital_item_id
         WHERE s2.status = 'active'
         GROUP BY c2.product_id, c2.digital_item_id, c2.acquisition_cost
       ) c`,
      []
    );

    // Apply filters (productId / acquisition type) to the revenue + sold-cost set.
    let filteredSalesAgg = salesAgg[0];
    let filteredCostOfSold = soldCostAgg[0];
    if (type || productId) {
      const saleWhere = ['s.status = \'active\''];
      const saleParams = [];
      const soldWhere = ['s2.status = \'active\''];
      const soldParams = [];
      if (productId) {
        saleWhere.push('s.product_id = ?');
        saleParams.push(productId);
        soldWhere.push('s2.product_id = ?');
        soldParams.push(productId);
      }
      if (type) {
        const typeVal = normalizeAcquisitionType(type);
        saleWhere.push('EXISTS (SELECT 1 FROM account_costs c3 WHERE c3.product_id = s.product_id AND c3.digital_item_id = s.digital_item_id AND c3.acquisition_type = ?)');
        saleParams.push(typeVal);
        soldWhere.push('EXISTS (SELECT 1 FROM account_costs c5 WHERE c5.product_id = s2.product_id AND c5.digital_item_id = s2.digital_item_id AND c5.acquisition_type = ?)');
        soldParams.push(typeVal);
      }

      const [fsRows] = await pool.query(
        `SELECT COUNT(*) AS total_sales, COALESCE(SUM(s.sale_price), 0) AS total_sales_revenue
         FROM account_sales s
         WHERE ${saleWhere.join(' AND ')}`,
        saleParams
      );
      const [fsCost] = await pool.query(
        `SELECT COALESCE(SUM(c6.acquisition_cost), 0) AS total_cost_of_sold
         FROM (
           SELECT c7.digital_item_id, c7.product_id, c7.acquisition_cost
           FROM account_sales s2
           INNER JOIN account_costs c7 ON c7.product_id = s2.product_id AND c7.digital_item_id = s2.digital_item_id
           WHERE ${soldWhere.join(' AND ')}
           GROUP BY c7.product_id, c7.digital_item_id, c7.acquisition_cost
         ) c6`,
        soldParams
      );
      filteredSalesAgg = fsRows[0];
      filteredCostOfSold = fsCost[0];
    }

    const totalSalesRevenue = Math.round(Number(filteredSalesAgg?.total_sales_revenue || 0) * 100) / 100;
    const totalCostOfSold = Math.round(Number(filteredCostOfSold?.total_cost_of_sold || 0) * 100) / 100;
    const totalProfit = Math.round((totalSalesRevenue - totalCostOfSold) * 100) / 100;
    const totalSalesCount = Number(filteredSalesAgg?.total_sales || 0);

    const byType = {};
    let totalAccounts = 0;
    let totalPurchased = 0;
    let totalCreated = 0;
    let totalAcquisitionCost = 0;
    for (const row of costAgg || []) {
      const t = row.acquisition_type || 'unknown';
      byType[t] = {
        totalAccounts: Number(row.total_accounts) || 0,
        totalAcquisitionCost: Number(row.total_acquisition_cost) || 0,
      };
      totalAccounts += Number(row.total_accounts) || 0;
      totalAcquisitionCost += Number(row.total_acquisition_cost) || 0;
      if (t === 'purchased') totalPurchased += Number(row.total_accounts) || 0;
      if (t === 'created_from_balance') totalCreated += Number(row.total_accounts) || 0;
    }

    // Per-account profitability rows for the drill-down table
    const [accountRows] = await pool.query(
      `SELECT
         c.product_id,
         c.digital_item_id,
         c.acquisition_type,
         c.acquisition_cost,
         p.name AS product_name,
         p.image AS product_image,
         COUNT(s.id) AS sales_count,
         COALESCE(SUM(s.sale_price), 0) AS total_revenue
       FROM account_costs c
       LEFT JOIN products p ON p.id = c.product_id
       LEFT JOIN account_sales s ON s.product_id = c.product_id AND s.digital_item_id = c.digital_item_id AND s.status = 'active'
       ${whereSql}
       GROUP BY c.id
       ORDER BY total_revenue DESC
       LIMIT 500`,
      params
    );
    const accounts = (accountRows || []).map((r) => {
      const revenue = Math.round(Number(r.total_revenue) * 100) / 100;
      const cost = r.acquisition_cost != null ? Number(r.acquisition_cost) : null;
      const profit = cost != null ? Math.round((revenue - cost) * 100) / 100 : null;
      const margin = revenue > 0 && profit != null ? Math.round((profit / revenue) * 1000) / 10 : null;
      return {
        product_id: r.product_id,
        digital_item_id: r.digital_item_id,
        product_name: r.product_name,
        product_image: r.product_image,
        acquisition_type: r.acquisition_type,
        acquisition_cost: cost,
        sales_count: Number(r.sales_count) || 0,
        total_revenue: revenue,
        total_profit: profit,
        profit_margin: margin,
      };
    });

    return res.json({
      success: true,
      summary: {
        totalAccounts,
        totalPurchased,
        totalCreated,
        totalLegacy: byType.legacy?.totalAccounts || 0,
        totalUnknown: byType.unknown?.totalAccounts || 0,
        totalAcquisitionCost: Math.round(totalAcquisitionCost * 100) / 100,
        totalSalesCount,
        totalSalesRevenue,
        totalProfit,
        profitMargin: totalSalesRevenue > 0 ? Math.round((totalProfit / totalSalesRevenue) * 1000) / 10 : null,
      },
      byType,
      accounts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/account-finance/balance-usage?balanceId= — usage ledger for a balance source
accountFinanceRoutes.get('/account-finance/balance-usage', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  try {
    const { balanceId } = req.query;
    const [rows] = balanceId
      ? await pool.query('SELECT * FROM balance_usage WHERE balance_id = ? ORDER BY created_at DESC', [balanceId])
      : await pool.query('SELECT * FROM balance_usage ORDER BY created_at DESC LIMIT 500');
    return res.json({ success: true, items: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/account-finance/sales — explicit sale record (manual / legacy / resale flows)
accountFinanceRoutes.post('/account-finance/sales', requireAuth, requireRoles(ADMIN_ROLES), async (req, res) => {
  const {
    productId, digitalItemId, slotName, orderNumber, orderId, buyerName, buyerEmail,
    salePrice, saleDate, isFullAccount, accountSaleId,
  } = req.body || {};
  if (!productId || !digitalItemId) {
    return res.status(400).json({ success: false, error: 'productId and digitalItemId are required' });
  }

  try {
    const saleId = accountSaleId || `${orderNumber || 'MANUAL'}-${productId}-${digitalItemId}-${slotName || 'sale'}`.slice(0, 36);
    const [result] = await pool.query(
      `INSERT IGNORE INTO account_sales
        (account_sale_id, product_id, digital_item_id, slot_name, order_id, order_number,
         buyer_name, buyer_email, sale_price, sale_date, status, is_full_account)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [saleId, productId, digitalItemId, slotName || 'Full Account', orderId || null,
       orderNumber || null, buyerName || null, buyerEmail || null,
       salePrice != null ? Number(salePrice) : null, saleDate ? new Date(saleDate) : new Date(),
       isFullAccount ? 1 : 0]
    );
    if (result.affectedRows === 0) {
      return res.status(200).json({ success: true, message: 'Sale record already exists' });
    }
    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default accountFinanceRoutes;
