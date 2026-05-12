import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRoles } from '../middleware/authMiddleware.js';

export const tasksRoutes = Router();

tasksRoutes.get('/tasks', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
      const normalized = rows.map((t) => ({
        ...t,
        assignees: t.assignees ? JSON.parse(t.assignees) : [],
      }));
      return res.json(normalized);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch tasks' });
    }
  });
});

tasksRoutes.post('/tasks', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const t = req.body || {};
      const [result] = await pool.query(
        'INSERT INTO tasks (title, description, status, priority, assignees, deadline) VALUES (?, ?, ?, ?, ?, ?)',
        [
          t.title,
          t.description || '',
          t.status || 'todo',
          t.priority || 'medium',
          t.assignees ? JSON.stringify(t.assignees) : JSON.stringify([]),
          t.deadline || null,
        ]
      );
      const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [result.insertId]);
      const row = rows[0];
      return res.json({ ...row, assignees: row.assignees ? JSON.parse(row.assignees) : [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create task' });
    }
  });
});

tasksRoutes.put('/tasks/:id', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const id = req.params.id;
      const t = req.body || {};

      const updates = [];
      const values = [];
      const setIfDefined = (col, val) => {
        if (val !== undefined) {
          updates.push(`${col} = ?`);
          values.push(val);
        }
      };

      setIfDefined('title', t.title);
      setIfDefined('description', t.description);
      setIfDefined('status', t.status);
      setIfDefined('priority', t.priority);
      if (t.assignees !== undefined) setIfDefined('assignees', JSON.stringify(t.assignees || []));
      setIfDefined('deadline', t.deadline);

      if (updates.length) {
        values.push(id);
        await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
      const row = rows[0];
      return res.json({ ...row, assignees: row.assignees ? JSON.parse(row.assignees) : [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update task' });
    }
  });
});

tasksRoutes.delete('/tasks/:id', async (req, res) => {
  return requireRoles(['admin', 'manager', 'staff'])(req, res, async () => {
    try {
      const id = req.params.id;
      await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to delete task' });
    }
  });
});

