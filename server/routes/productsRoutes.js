import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles, requirePermission } from '../middleware/authMiddleware.js';

export const productsRoutes = Router();

function parseJsonColumn(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function checkDuplicateDigitalItems(digitalItems) {
  if (!Array.isArray(digitalItems) || digitalItems.length === 0) return null;

  const emails = new Set();
  const codes = new Set();

  for (const item of digitalItems) {
    const itemEmails = new Set();
    if (item.email) {
      const emailClean = item.email.trim().toLowerCase();
      if (emailClean) {
        if (emails.has(emailClean)) {
          return `Duplicate email "${item.email}" found in the stock list.`;
        }
        itemEmails.add(emailClean);
      }
    }
    if (item.outlookEmail) {
      const outlookClean = item.outlookEmail.trim().toLowerCase();
      if (outlookClean) {
        if (emails.has(outlookClean) && !itemEmails.has(outlookClean)) {
          return `Duplicate email "${item.outlookEmail}" found in the stock list.`;
        }
        itemEmails.add(outlookClean);
      }
    }
    
    // Add item unique emails to the global set
    itemEmails.forEach(e => emails.add(e));

    if (item.code) {
      const codeClean = item.code.trim().toLowerCase();
      if (codeClean) {
        if (codes.has(codeClean)) {
          return `Duplicate code "${item.code}" found in the stock list.`;
        }
        codes.add(codeClean);
      }
    }

    if (item.slots) {
      for (const slotName of Object.keys(item.slots)) {
        const slotCode = item.slots[slotName]?.code ? String(item.slots[slotName].code).trim().toLowerCase() : '';
        if (slotCode) {
          if (codes.has(slotCode)) {
            return `Duplicate code "${item.slots[slotName].code}" found in the stock list.`;
          }
          codes.add(slotCode);
        }
      }
    }
  }

  return null;
}


function normalizeProductRow(row) {
  return {
    ...row,
    attributes: parseJsonColumn(row.attributes),
    digitalItems: parseJsonColumn(row.digitalItems),
  };
}

async function attachVariants(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [variants] = await pool.query(
    `SELECT id, product_id, name, price, cost, stock
     FROM product_variants
     WHERE product_id IN (${placeholders})
     ORDER BY id ASC`,
    ids
  );
  const byProductId = new Map();
  for (const v of variants) {
    if (!byProductId.has(v.product_id)) byProductId.set(v.product_id, []);
    byProductId.get(v.product_id).push(v);
  }
  return products.map((p) => ({ ...p, product_variants: byProductId.get(p.id) || [] }));
}

productsRoutes.get('/public/products', async (req, res) => {
  try {
    const category = req.query.category ? String(req.query.category) : null;
    const search = req.query.search ? String(req.query.search) : null;

    const where = [];
    const params = [];
    if (category) {
      where.push('category_slug = ?');
      params.push(category);
    }
    if (search) {
      where.push('LOWER(name) LIKE ?');
      params.push(`%${search.toLowerCase()}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM products ${whereSql} ORDER BY created_at DESC`, params);
    const products = rows.map(normalizeProductRow);
    const withVariants = await attachVariants(products);
    return res.json({ products: withVariants });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch products' });
  }
});

productsRoutes.get('/public/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    const product = normalizeProductRow(rows[0]);
    const [variants] = await pool.query(
      'SELECT id, product_id, name, price, cost, stock FROM product_variants WHERE product_id = ? ORDER BY id ASC',
      [id]
    );
    return res.json({ product: { ...product, product_variants: variants } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch product' });
  }
});

productsRoutes.put('/public/products/:id/digital-items', async (req, res) => {
  try {
    const id = req.params.id;
    const { digitalItems } = req.body || {};
    const duplicateError = checkDuplicateDigitalItems(digitalItems);
    if (duplicateError) {
      return res.status(400).json({ success: false, error: duplicateError });
    }
    await pool.query('UPDATE products SET `digitalItems` = ? WHERE id = ?', [JSON.stringify(digitalItems || []), id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update product' });
  }
});

productsRoutes.get('/products', async (req, res) => {
  return requirePermission('products', 'read')(req, res, async () => {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    const products = rows.map(normalizeProductRow);
    const withVariants = await attachVariants(products);
    return res.json({ products: withVariants });
  });
});

productsRoutes.get('/products/:id', async (req, res) => {
  return requirePermission('products', 'read')(req, res, async () => {
    const id = req.params.id;
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    const product = normalizeProductRow(rows[0]);
    const [variants] = await pool.query(
      'SELECT id, product_id, name, price, cost, stock FROM product_variants WHERE product_id = ? ORDER BY id ASC',
      [id]
    );
    return res.json({ products: [{ ...product, product_variants: variants }] });
  });
});

productsRoutes.post('/products', async (req, res) => {
  return requirePermission('products', 'write')(req, res, async () => {
    const body = req.body || {};
    const variants = Array.isArray(body.product_variants) ? body.product_variants : [];
    const productData = { ...body };
    delete productData.product_variants;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const duplicateError = checkDuplicateDigitalItems(productData.digitalItems);
      if (duplicateError) {
        await conn.rollback();
        return res.status(400).json({ success: false, error: duplicateError });
      }

      const attributesJson = productData.attributes === undefined ? null : JSON.stringify(productData.attributes);
      const digitalItemsJson = productData.digitalItems === undefined ? null : JSON.stringify(productData.digitalItems);

      const [result] = await conn.query(
        `INSERT INTO products
         (name, category_slug, sub_category_slug, price, cost, stock, image, description, attributes, \`digitalItems\`,
          \`productCode\`, \`purchasedEmail\`, \`purchasedPassword\`, instructions, status, sendEmailEnabled, emailTemplate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.name,
          productData.category_slug || null,
          productData.sub_category_slug || null,
          productData.price ?? null,
          productData.cost ?? null,
          productData.stock ?? 0,
          productData.image || null,
          productData.description || null,
          attributesJson,
          digitalItemsJson,
          productData.productCode || null,
          productData.purchasedEmail || null,
          productData.purchasedPassword || null,
          productData.instructions || null,
          productData.status || 'In Stock',
          !!productData.sendEmailEnabled,
          productData.emailTemplate || null,
        ]
      );

      const productId = result.insertId;

      if (variants.length) {
        const values = [];
        const placeholders = variants
          .map((v) => {
            values.push(productId, v.name, v.price ?? null, v.cost ?? null, v.stock ?? 0);
            return '(?, ?, ?, ?, ?)';
          })
          .join(', ');
        await conn.query(
          `INSERT INTO product_variants (product_id, name, price, cost, stock) VALUES ${placeholders}`,
          values
        );
      }

      await conn.commit();
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [productId]);
      return res.json(normalizeProductRow(rows[0]));
    } catch (err) {
      await conn.rollback();
      return res.status(500).json({ success: false, error: err.message || 'Failed to create product' });
    } finally {
      conn.release();
    }
  });
});

productsRoutes.put('/products/:id', async (req, res) => {
  return requirePermission('products', 'write')(req, res, async () => {
    const id = req.params.id;
    const body = req.body || {};
    const variants = body.product_variants;
    const productData = { ...body };
    delete productData.product_variants;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (productData.digitalItems !== undefined) {
        const duplicateError = checkDuplicateDigitalItems(productData.digitalItems);
        if (duplicateError) {
          await conn.rollback();
          return res.status(400).json({ success: false, error: duplicateError });
        }
      }

      const attributesJson = productData.attributes === undefined ? undefined : JSON.stringify(productData.attributes);
      const digitalItemsJson = productData.digitalItems === undefined ? undefined : JSON.stringify(productData.digitalItems);

      const updates = [];
      const values = [];
      const setIfDefined = (col, val) => {
        if (val !== undefined) {
          updates.push(`${col} = ?`);
          values.push(val);
        }
      };

      setIfDefined('name', productData.name);
      setIfDefined('category_slug', productData.category_slug);
      setIfDefined('sub_category_slug', productData.sub_category_slug);
      setIfDefined('price', productData.price);
      setIfDefined('cost', productData.cost);
      setIfDefined('stock', productData.stock);
      setIfDefined('image', productData.image);
      setIfDefined('description', productData.description);
      setIfDefined('attributes', attributesJson);
      setIfDefined('`digitalItems`', digitalItemsJson);
      setIfDefined('`productCode`', productData.productCode);
      setIfDefined('`purchasedEmail`', productData.purchasedEmail);
      setIfDefined('`purchasedPassword`', productData.purchasedPassword);
      setIfDefined('instructions', productData.instructions);
      setIfDefined('status', productData.status);
      if (productData.sendEmailEnabled !== undefined) setIfDefined('sendEmailEnabled', !!productData.sendEmailEnabled);
      setIfDefined('emailTemplate', productData.emailTemplate);

      if (updates.length) {
        values.push(id);
        await conn.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      if (variants !== undefined) {
        await conn.query('DELETE FROM product_variants WHERE product_id = ?', [id]);
        if (Array.isArray(variants) && variants.length) {
          const vValues = [];
          const vPlaceholders = variants
            .map((v) => {
              vValues.push(id, v.name, v.price ?? null, v.cost ?? null, v.stock ?? 0);
              return '(?, ?, ?, ?, ?)';
            })
            .join(', ');
          await conn.query(
            `INSERT INTO product_variants (product_id, name, price, cost, stock) VALUES ${vPlaceholders}`,
            vValues
          );
        }
      }

      await conn.commit();
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
      return res.json(normalizeProductRow(rows[0]));
    } catch (err) {
      await conn.rollback();
      return res.status(500).json({ success: false, error: err.message || 'Failed to update product' });
    } finally {
      conn.release();
    }
  });
});

productsRoutes.delete('/products/:id', async (req, res) => {
  return requirePermission('products', 'write')(req, res, async () => {
    const id = req.params.id;
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true });
  });
});

productsRoutes.get('/products/:id/overview', async (req, res) => {
  return requirePermission('products', 'read')(req, res, async () => {
    const productId = req.params.id;
    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [productId]);
    if (!productRows.length) return res.status(404).json({ success: false, error: 'Not found' });

    const product = normalizeProductRow(productRows[0]);
    const digitalItems = Array.isArray(product.digitalItems) ? product.digitalItems : [];

    let totalSold = 0;
    let totalRemaining = 0;
    const soldItems = [];
    const remainingItems = [];

    for (const item of digitalItems) {
      if (item && item.slots) {
        for (const [slotName, slotData] of Object.entries(item.slots)) {
          if (slotData && slotData.sold) {
            totalSold += 1;
            soldItems.push({
              orderId: slotData.orderId || 0,
              orderNumber: slotData.orderId ? `#${slotData.orderId}` : 'N/A',
              customerName: slotData.customerName || 'Customer',
              customerEmail: item.email || 'customer@example.com',
              date: new Date().toISOString(),
              email: item.email,
              password: item.password,
              code: slotData.code,
            });
          } else {
            totalRemaining += 1;
            remainingItems.push({
              email: item.email,
              password: item.password,
              code: slotData?.code,
              type: slotName,
              status: 'available',
            });
          }
        }
      }
    }

    const [orders] = await pool.query('SELECT * FROM orders');
    const customers = (orders || []).map((order) => ({
      name: order.customer_name || 'Unknown',
      email: order.customer_email || 'unknown@example.com',
      date: order.created_at,
      orderNumber: order.order_number || `#${order.id}`,
    }));

    return res.json({
      product: {
        id: product.id,
        name: product.name,
        image: product.image || '/placeholder-image.png',
      },
      stats: {
        totalSold,
        totalRemaining,
      },
      soldItems,
      remainingItems,
      customers,
    });
  });
});
