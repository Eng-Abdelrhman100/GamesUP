import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';

export const balanceInventoryRoutes = Router();

// Get all balance inventory items
balanceInventoryRoutes.get('/balance-inventory', requireAuth, requireRoles(['admin', 'manager']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM balance_inventory ORDER BY created_at DESC');
    res.json({ success: true, items: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new balance inventory item
balanceInventoryRoutes.post('/balance-inventory', requireAuth, requireRoles(['admin', 'manager']), async (req, res) => {
  const { email, password, birthdate, outlook_email, outlook_password, dollar_balance, dollar_to_egp_rate } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO balance_inventory 
       (email, password, birthdate, outlook_email, outlook_password, dollar_balance, dollar_to_egp_rate) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, password || null, birthdate || null, outlook_email || null, outlook_password || null, dollar_balance || 0, dollar_to_egp_rate || 0]
    );
    
    const [rows] = await pool.query('SELECT * FROM balance_inventory WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update a balance inventory item
balanceInventoryRoutes.put('/balance-inventory/:id', requireAuth, requireRoles(['admin', 'manager']), async (req, res) => {
  const { id } = req.params;
  const { email, password, birthdate, outlook_email, outlook_password, dollar_balance, dollar_to_egp_rate } = req.body;

  try {
    const updates = [];
    const values = [];

    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (password !== undefined) { updates.push('password = ?'); values.push(password); }
    if (birthdate !== undefined) { updates.push('birthdate = ?'); values.push(birthdate); }
    if (outlook_email !== undefined) { updates.push('outlook_email = ?'); values.push(outlook_email); }
    if (outlook_password !== undefined) { updates.push('outlook_password = ?'); values.push(outlook_password); }
    if (dollar_balance !== undefined) { updates.push('dollar_balance = ?'); values.push(dollar_balance); }
    if (dollar_to_egp_rate !== undefined) { updates.push('dollar_to_egp_rate = ?'); values.push(dollar_to_egp_rate); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    await pool.query(`UPDATE balance_inventory SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.query('SELECT * FROM balance_inventory WHERE id = ?', [id]);
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a balance inventory item
balanceInventoryRoutes.delete('/balance-inventory/:id', requireAuth, requireRoles(['admin', 'manager']), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM balance_inventory WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
