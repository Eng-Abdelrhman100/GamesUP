import { Router } from 'express';
import { requireRoles } from '../middleware/authMiddleware.js';
import { pool } from '../db/pool.js';

const tableConfig = {
  notifications: {
    allowed: ['title', 'message', 'type', 'is_read'],
    orderBy: 'created_at DESC',
    roles: ['admin', 'manager', 'staff'],
  },
  outlook_accounts: {
    allowed: ['email', 'password', 'recovery_email', 'status', 'product_name', 'last_login'],
    orderBy: 'created_at DESC, id DESC',
    roles: ['admin'],
  },
  sub_categories: {
    allowed: ['category_id', 'name', 'description', 'slug', 'display_order', 'is_active'],
    orderBy: 'display_order ASC, id ASC',
    roles: ['admin', 'manager', 'staff'],
  },
  product_attributes: {
    allowed: ['name', 'type', 'options', 'is_required', 'display_order', 'is_active'],
    orderBy: 'display_order ASC, id ASC',
    roles: ['admin', 'manager', 'staff'],
  },
  email_templates: {
    allowed: ['type', 'subject', 'body'],
    orderBy: 'id ASC',
    roles: ['admin'],
  },
};

function getConfig(table) {
  const config = tableConfig[table];
  if (!config) {
    const err = new Error('Invalid table');
    err.statusCode = 400;
    throw err;
  }
  return config;
}

function pickAllowed(allowed, input) {
  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}

export const tableRoutes = Router();

async function updateRow(req, res) {
  const { table, id } = req.params;
  const config = getConfig(table);
  return requireRoles(config.roles)(req, res, async () => {
    const data = pickAllowed(config.allowed, req.body || {});
    const keys = Object.keys(data);
    if (keys.length === 0) return res.status(400).json({ success: false, error: 'No valid fields' });

    const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
    const values = keys.map((k) => (k === 'options' && data[k] != null ? JSON.stringify(data[k]) : data[k]));
    values.push(id);

    await pool.query(`UPDATE \`${table}\` SET ${setClause} WHERE id = ?`, values);
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
    return res.json(rows[0]);
  });
}

tableRoutes.get('/table/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const config = getConfig(table);
    requireRoles(config.roles)(req, res, async () => {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` ORDER BY ${config.orderBy}`);
      return res.json(rows);
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to fetch' });
  }
});

tableRoutes.post('/table/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const config = getConfig(table);
    requireRoles(config.roles)(req, res, async () => {
      const data = pickAllowed(config.allowed, req.body || {});
      const keys = Object.keys(data);
      if (keys.length === 0) return res.status(400).json({ success: false, error: 'No valid fields' });

      const columns = keys.map((k) => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => (k === 'options' && data[k] != null ? JSON.stringify(data[k]) : data[k]));

      const [result] = await pool.query(
        `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`,
        values
      );
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [result.insertId]);
      return res.json(rows[0]);
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to create' });
  }
});

tableRoutes.put('/table/:table/:id', async (req, res) => {
  try {
    return await updateRow(req, res);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update' });
  }
});

tableRoutes.patch('/table/:table/:id', async (req, res) => {
  try {
    return await updateRow(req, res);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update' });
  }
});

tableRoutes.delete('/table/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const config = getConfig(table);
    requireRoles(config.roles)(req, res, async () => {
      await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
      return res.json({ success: true });
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to delete' });
  }
});

tableRoutes.put('/table/:table/update-all', async (req, res) => {
  try {
    const { table } = req.params;
    const config = getConfig(table);
    requireRoles(config.roles)(req, res, async () => {
      const { updates, column, value } = req.body || {};
      const data = pickAllowed(config.allowed, updates || {});
      const keys = Object.keys(data);
      if (!column || value === undefined) return res.status(400).json({ success: false, error: 'column and value required' });
      if (keys.length === 0) return res.status(400).json({ success: false, error: 'No valid fields' });
      if (!config.allowed.includes(column)) return res.status(400).json({ success: false, error: 'Invalid filter column' });

      const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => data[k]);
      values.push(value);
      await pool.query(`UPDATE \`${table}\` SET ${setClause} WHERE \`${column}\` = ?`, values);
      return res.json({ success: true });
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update' });
  }
});
