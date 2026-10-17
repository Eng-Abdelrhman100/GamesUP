import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requirePermission } from '../middleware/authMiddleware.js';

export const bookingRoutes = Router();

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

export const BOOKING_DEFAULT_DAYS = WEEK_DAYS.map((day) => ({
  day,
  enabled: true,
  times: [...DEFAULT_TIMES],
}));

const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'completed', 'cancelled']);

function parseDays(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((d) => ({
        day: String(d?.day || '').trim(),
        enabled: d?.enabled !== false,
        times: Array.isArray(d?.times)
          ? [...new Set(d.times.map((t) => String(t || '').trim()).filter(Boolean))].sort()
          : [],
      }))
      .filter((d) => d.day);
  } catch {
    return null;
  }
}

async function getBookingConfig() {
  const [rows] = await pool.query(
    'SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?)',
    ['booking_enabled', 'booking_days']
  );
  const map = {};
  for (const r of rows || []) map[r.setting_key] = r.setting_value;
  const enabledRaw = map.booking_enabled;
  const enabled = enabledRaw == null || enabledRaw === '' ? true : (enabledRaw === true || enabledRaw === 'true' || enabledRaw === '1');
  const days = parseDays(map.booking_days) || BOOKING_DEFAULT_DAYS;
  return { enabled, days };
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekdayName(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(dt.getTime())) return null;
  // getDay(): 0=Sunday..6=Saturday → map to Monday-first list
  return WEEK_DAYS[(dt.getDay() + 6) % 7];
}

// Public: availability calendar (enabled flag + weekly schedule + taken slots).
bookingRoutes.get('/booking-availability', async (req, res) => {
  try {
    const { enabled, days } = await getBookingConfig();
    const windowDays = Math.min(60, Math.max(1, parseInt(String(req.query.days || '28'), 10) || 28));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [];
    for (let i = 0; i < windowDays; i += 1) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + i);
      dates.push(toDateStr(dt));
    }
    let taken = {};
    if (dates.length) {
      const placeholders = dates.map(() => '?').join(', ');
      const [rows] = await pool.query(
        `SELECT booking_date, booking_time FROM service_bookings
         WHERE booking_date IN (${placeholders}) AND status NOT IN ('cancelled')`,
        dates
      );
      for (const r of rows || []) {
        const key = String(r.booking_date).slice(0, 10);
        if (!taken[key]) taken[key] = [];
        taken[key].push(String(r.booking_time));
      }
    }
    return res.json({ success: true, enabled, days, taken });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to load availability' });
  }
});

// Public: create a booking slot request.
bookingRoutes.post('/bookings', async (req, res) => {
  try {
    const b = req.body || {};
    const { enabled, days } = await getBookingConfig();
    if (!enabled) {
      return res.status(400).json({ success: false, error: 'Booking is currently unavailable.' });
    }
    const serviceType = String(b.service_type || '').toLowerCase();
    if (!['repair', 'install'].includes(serviceType)) {
      return res.status(400).json({ success: false, error: 'Service type must be repair or install.' });
    }
    const dateStr = String(b.booking_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, error: 'A valid booking day is required (YYYY-MM-DD).' });
    }
    const timeStr = String(b.booking_time || '').trim();
    if (!timeStr) {
      return res.status(400).json({ success: false, error: 'A booking time is required.' });
    }
    const dayName = weekdayName(dateStr);
    if (!dayName) {
      return res.status(400).json({ success: false, error: 'Invalid booking day.' });
    }
    const dayCfg = days.find((d) => d.day.toLowerCase() === dayName.toLowerCase());
    if (!dayCfg || dayCfg.enabled === false) {
      return res.status(400).json({ success: false, error: `${dayName}s are not available for booking.` });
    }
    if (!dayCfg.times.includes(timeStr)) {
      return res.status(400).json({ success: false, error: `${timeStr} is not an available time on ${dayName}s.` });
    }
    const todayStr = toDateStr(new Date());
    if (dateStr < todayStr) {
      return res.status(400).json({ success: false, error: 'Booking day cannot be in the past.' });
    }
    const name = String(b.customer_name || '').trim();
    const phone = String(b.phone || b.customer_phone || '').trim();
    if (!name) return res.status(400).json({ success: false, error: 'Name is required.' });
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required.' });

    const [existing] = await pool.query(
      `SELECT id FROM service_bookings WHERE booking_date = ? AND booking_time = ? AND status NOT IN ('cancelled') LIMIT 1`,
      [dateStr, timeStr]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, error: 'This slot was just taken. Please choose another time.' });
    }

    const [result] = await pool.query(
      `INSERT INTO service_bookings
        (service_type, booking_date, booking_time, day_of_week, customer_name, customer_email, phone, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        serviceType,
        dateStr,
        timeStr,
        dayName,
        name,
        b.customer_email ? String(b.customer_email).trim() || null : null,
        phone,
        b.notes ? String(b.notes).trim() || null : null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM service_bookings WHERE id = ? LIMIT 1', [result.insertId]);
    return res.json({ success: true, booking: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create booking' });
  }
});

// Admin: list bookings.
bookingRoutes.get('/bookings', requirePermission('bookings', 'read'), async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const where = status && BOOKING_STATUSES.has(status.toLowerCase()) ? 'WHERE status = ?' : '';
    const params = where ? [status.toLowerCase()] : [];
    const [rows] = await pool.query(`SELECT * FROM service_bookings ${where} ORDER BY booking_date ASC, booking_time ASC`, params);
    return res.json({ bookings: rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch bookings' });
  }
});

// Admin: update booking status / notes.
bookingRoutes.put('/bookings/:id', requirePermission('bookings', 'write'), async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const updates = [];
    const values = [];
    if (b.status !== undefined) {
      const s = String(b.status).toLowerCase();
      if (!BOOKING_STATUSES.has(s)) {
        return res.status(400).json({ success: false, error: 'Invalid status.' });
      }
      updates.push('status = ?');
      values.push(s);
    }
    if (b.notes !== undefined) {
      updates.push('notes = ?');
      values.push(b.notes ? String(b.notes) : null);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update.' });
    values.push(id);
    await pool.query(`UPDATE service_bookings SET ${updates.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM service_bookings WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, booking: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update booking' });
  }
});

// Admin: delete a booking.
bookingRoutes.delete('/bookings/:id', requirePermission('bookings', 'write'), async (req, res) => {
  try {
    await pool.query('DELETE FROM service_bookings WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete booking' });
  }
});
