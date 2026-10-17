import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRoles, requirePermission } from '../middleware/authMiddleware.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

export const psPlusRoutes = Router();

const BACKUP_CODE_COUNT = 12;
const MANAGER_ROLES = ['admin', 'manager'];
const READ = requirePermission('ps-plus-inventory', 'read');
const WRITE = requirePermission('ps-plus-inventory', 'write');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().slice(0, 64);
}

async function audit(req, action, entityType, entityId, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user?.id ?? null, req.user?.email ?? null, action, entityType, entityId ?? null,
       JSON.stringify(metadata), clientIp(req)]
    );
  } catch (err) {
    console.error(`Audit log insert failed (${action}):`, err.message);
  }
}

// Validate an array of backup codes: exactly 12, all non-empty, no intra-array duplicates.
function validateBackupCodes(codes) {
  const errors = [];
  if (!Array.isArray(codes)) {
    return [{ field: 'backupCodes', message: `Exactly ${BACKUP_CODE_COUNT} unique backup codes are required.` }];
  }
  const trimmed = codes.map((c) => String(c || '').trim()).filter(Boolean);
  if (trimmed.length !== BACKUP_CODE_COUNT) {
    errors.push({ field: 'backupCodes', message: `Exactly ${BACKUP_CODE_COUNT} backup codes are required (received ${trimmed.length}).` });
  }
  const seen = new Set();
  for (const code of trimmed) {
    const key = code.toLowerCase();
    if (seen.has(key)) {
      errors.push({ field: 'backupCodes', message: `Duplicate backup code "${code}" in the same account.` });
    }
    seen.add(key);
  }
  return errors;
}

async function codesExistInInventory(codes, conn = pool) {
  if (!Array.isArray(codes) || codes.length === 0) return new Set();
  const placeholders = codes.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT code FROM ps_plus_backup_codes WHERE LOWER(code) IN (${placeholders})`,
    codes.map((c) => String(c).toLowerCase())
  );
  return new Set((rows || []).map((r) => String(r.code).toLowerCase()));
}

async function licensesExistInInventory(codes, conn = pool) {
  if (!Array.isArray(codes) || codes.length === 0) return new Set();
  const placeholders = codes.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT license_code FROM ps_plus_license_codes WHERE LOWER(license_code) IN (${placeholders})`,
    codes.map((c) => String(c).toLowerCase())
  );
  return new Set((rows || []).map((r) => String(r.license_code).toLowerCase()));
}

// Fetch a full account row + its backup codes + license (no decrypted password).
async function getAccountDetail(accountId) {
  const [accounts] = await pool.query('SELECT * FROM ps_plus_accounts WHERE id = ? LIMIT 1', [accountId]);
  if (!accounts.length) return null;
  const account = accounts[0];
  const [codes] = await pool.query(
    'SELECT id, code, status, used_at, created_at FROM ps_plus_backup_codes WHERE account_id = ? ORDER BY id ASC',
    [accountId]
  );
  const [licenses] = await pool.query(
    'SELECT * FROM ps_plus_license_codes WHERE account_id = ? OR id = ? ORDER BY id ASC',
    [accountId, account.license_id]
  );
  return { account, backupCodes: codes, licenses };
}

// Insert one account (email + encrypted password) + 12 backup codes inside conn.
async function insertAccountWithCodes(conn, { email, password, backupCodes, createdBy }) {
  const emailClean = String(email || '').trim().toLowerCase();
  const enc = encryptSecret(password);
  const [accRes] = await conn.query(
    `INSERT INTO ps_plus_accounts (email, password_encrypted, credential_ref, status, created_by)
     VALUES (?, ?, ?, 'AVAILABLE', ?)`,
    [emailClean, enc, 'aes-256-gcm', createdBy ?? null]
  );
  const accountId = accRes.insertId;

  const values = [];
  const placeholders = [];
  for (const code of backupCodes) {
    const c = String(code || '').trim();
    if (!c) continue;
    values.push(accountId, c);
    placeholders.push('(?, ?)');
  }
  if (placeholders.length) {
    await conn.query(
      `INSERT INTO ps_plus_backup_codes (account_id, code) VALUES ${placeholders.join(', ')}`,
      values
    );
  }
  return accountId;
}

function accountRowSafe(row, extras = {}) {
  if (!row) return null;
  const { password_encrypted, credential_ref, ...safe } = row;
  return { ...safe, ...extras };
}

// ---------------------------------------------------------------------------
// Stats (account-aware stock display)
// ---------------------------------------------------------------------------
psPlusRoutes.get('/ps-plus/stats', requireAuth, READ, async (req, res) => {
  try {
    const [[accAgg], [licenseAgg], [backupAgg]] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS total,
           SUM(status = 'AVAILABLE') AS accounts_available,
           SUM(status = 'RESERVED') AS accounts_reserved,
           SUM(status = 'SOLD') AS accounts_sold,
           SUM(status IN ('DISABLED','EXPIRED')) AS accounts_inactive
         FROM ps_plus_accounts`
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           SUM(status = 'AVAILABLE') AS licenses_available,
           SUM(status = 'ASSIGNED') AS licenses_assigned,
           SUM(status = 'USED') AS licenses_used
         FROM ps_plus_license_codes`
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total,
           SUM(status = 'AVAILABLE') AS backup_available,
           SUM(status = 'USED') AS backup_used,
           SUM(status = 'INVALID') AS backup_invalid
         FROM ps_plus_backup_codes`
      ),
    ]);
    const num = (v) => Number(v) || 0;
    return res.json({
      success: true,
      stats: {
        accounts: {
          total: num(accAgg[0].total),
          available: num(accAgg[0].accounts_available),
          reserved: num(accAgg[0].accounts_reserved),
          sold: num(accAgg[0].accounts_sold),
          inactive: num(accAgg[0].accounts_inactive),
        },
        licenses: {
          total: num(licenseAgg[0].total),
          available: num(licenseAgg[0].licenses_available),
          assigned: num(licenseAgg[0].licenses_assigned),
          used: num(licenseAgg[0].licenses_used),
        },
        backupCodes: {
          total: num(backupAgg[0].total),
          available: num(backupAgg[0].backup_available),
          used: num(backupAgg[0].backup_used),
          invalid: num(backupAgg[0].backup_invalid),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Accounts list + detail
// ---------------------------------------------------------------------------
psPlusRoutes.get('/ps-plus/accounts', requireAuth, READ, async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = [];
    const params = [];
    if (status) {
      where.push('a.status = ?');
      params.push(String(status).toUpperCase());
    }
    if (search) {
      where.push('a.email LIKE ?');
      params.push(`%${String(search)}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT
         a.id, a.email, a.status, a.license_id, a.created_at, a.updated_at,
         COALESCE(bc.backup_total, 0) AS backup_total,
         COALESCE(bc.backup_available, 0) AS backup_available,
         COALESCE(bc.backup_used, 0) AS backup_used,
         l.license_code, l.status AS license_status
       FROM ps_plus_accounts a
       LEFT JOIN (
         SELECT account_id, COUNT(*) AS backup_total,
                SUM(status = 'AVAILABLE') AS backup_available,
                SUM(status IN ('USED','INVALID')) AS backup_used
         FROM ps_plus_backup_codes GROUP BY account_id
       ) bc ON bc.account_id = a.id
       LEFT JOIN ps_plus_license_codes l ON l.id = a.license_id
       ${whereSql}
       ORDER BY a.created_at DESC`,
      params
    );
    return res.json({ success: true, accounts: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

psPlusRoutes.get('/ps-plus/accounts/:id', requireAuth, READ, async (req, res) => {
  try {
    const detail = await getAccountDetail(req.params.id);
    if (!detail) return res.status(404).json({ success: false, error: 'Account not found' });
    const { account, backupCodes, licenses } = detail;
    const accountSafe = accountRowSafe(account);
    const license = licenses.find((l) => String(l.id) === String(account.license_id)) || licenses[0] || null;
    const isManager = MANAGER_ROLES.includes(String(req.user?.role || '').toLowerCase());
    return res.json({
      success: true,
      account: {
        ...accountSafe,
        license: isManager ? license : (license ? { id: license.id, status: license.status, license_code: undefined } : null),
        backupCodes: (backupCodes || []).map(({ code, ...rest }) => rest),
      },
      // Raw backup-code values are only exposed to admin/manager (credentials.view).
      backupCodes: isManager ? (backupCodes || []) : [],
      license: isManager ? license : null,
      canViewCredentials: isManager,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Create Type A — Account Only
// ---------------------------------------------------------------------------
psPlusRoutes.post('/ps-plus/accounts', requireAuth, WRITE, async (req, res) => {
  const { email, password, backupCodes } = req.body || {};
  const errors = [];
  if (!email || !String(email).trim()) errors.push({ field: 'email', message: 'Email is required.' });
  if (!password || !String(password).trim()) errors.push({ field: 'password', message: 'Password is required.' });
  errors.push(...validateBackupCodes(backupCodes));
  if (errors.length) return res.status(400).json({ success: false, errors });

  const emailClean = String(email).trim().toLowerCase();
  const codesTrimmed = (backupCodes || []).map((c) => String(c).trim()).filter(Boolean);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [emailDup] = await conn.query('SELECT id FROM ps_plus_accounts WHERE email = ? LIMIT 1', [emailClean]);
    if (emailDup.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, errors: [{ field: 'email', message: 'Email already exists in inventory.' }] });
    }
    const existingCodes = await codesExistInInventory(codesTrimmed, conn);
    if (existingCodes.size) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        errors: [{ field: 'backupCodes', message: 'One or more backup codes already exist in inventory.' }],
      });
    }

    const accountId = await insertAccountWithCodes(conn, { email: emailClean, password, backupCodes: codesTrimmed, createdBy: req.user?.id });
    await conn.commit();
    await audit(req, 'ps_plus.account_created', 'ps_plus_account', accountId, { email: emailClean });
    return res.status(201).json({ success: true, accountId });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// Create Type C — Account + License  (also supports LICENSE_ONLY)
// ---------------------------------------------------------------------------
psPlusRoutes.post('/ps-plus/inventory', requireAuth, WRITE, async (req, res) => {
  const body = req.body || {};
  const type = String(body.type || 'ACCOUNT_WITH_LICENSE').toUpperCase();
  const errors = [];

  if (type === 'LICENSE_ONLY') {
    const codes = Array.isArray(body.licenseCodes) ? body.licenseCodes : (body.licenseCode ? [body.licenseCode] : []);
    const trimmed = codes.map((c) => String(c || '').trim()).filter(Boolean);
    if (!trimmed.length) errors.push({ field: 'licenseCode', message: 'License code is required.' });
    if (errors.length) return res.status(400).json({ success: false, errors });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const existing = await licensesExistInInventory(trimmed, conn);
      const dupes = trimmed.filter((c) => existing.has(c.toLowerCase()));
      if (dupes.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, errors: [{ field: 'licenseCode', message: `License code already exists: ${dupes[0]}` }] });
      }
      const values = [];
      const placeholders = [];
      for (const c of trimmed) {
        values.push(c);
        placeholders.push('(?)');
      }
      const [result] = await conn.query(
        `INSERT INTO ps_plus_license_codes (license_code) VALUES ${placeholders.join(', ')}`,
        values
      );
      await conn.commit();
      await audit(req, 'ps_plus.license_created', 'ps_plus_license_code', result.insertId, { count: trimmed.length });
      return res.status(201).json({ success: true, count: trimmed.length });
    } catch (err) {
      await conn.rollback();
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      conn.release();
    }
  }

  // ACCOUNT_ONLY / ACCOUNT_WITH_LICENSE
  const account = body.account || {};
  const { email, password } = account;
  const backupCodes = body.backupCodes;
  const licenseCode = body.licenseCode ? String(body.licenseCode).trim() : '';

  if (!email || !String(email).trim()) errors.push({ field: 'email', message: 'Email is required.' });
  if (!password || !String(password).trim()) errors.push({ field: 'password', message: 'Password is required.' });
  errors.push(...validateBackupCodes(backupCodes));
  const isAccountWithLicense = type === 'ACCOUNT_WITH_LICENSE' || licenseCode;
  if (isAccountWithLicense && !licenseCode) {
    errors.push({ field: 'licenseCode', message: 'License code is required for Account + License inventory.' });
  }
  if (errors.length) return res.status(400).json({ success: false, errors });

  const emailClean = String(email).trim().toLowerCase();
  const codesTrimmed = (backupCodes || []).map((c) => String(c).trim()).filter(Boolean);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [emailDup] = await conn.query('SELECT id FROM ps_plus_accounts WHERE email = ? LIMIT 1', [emailClean]);
    if (emailDup.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, errors: [{ field: 'email', message: 'Email already exists in inventory.' }] });
    }
    const existingCodes = await codesExistInInventory(codesTrimmed, conn);
    if (existingCodes.size) {
      await conn.rollback();
      return res.status(400).json({ success: false, errors: [{ field: 'backupCodes', message: 'One or more backup codes already exist in inventory.' }] });
    }

    let licenseId = null;
    if (isAccountWithLicense) {
      const existingLic = await licensesExistInInventory([licenseCode], conn);
      if (existingLic.has(licenseCode.toLowerCase())) {
        await conn.rollback();
        return res.status(400).json({ success: false, errors: [{ field: 'licenseCode', message: 'License code already exists in inventory.' }] });
      }
      const [licRes] = await conn.query(
        `INSERT INTO ps_plus_license_codes (license_code, status) VALUES (?, 'ASSIGNED')`,
        [licenseCode]
      );
      licenseId = licRes.insertId;
    }

    // Create the account (temporarily AVAILABLE), then link license.
    const accountId = await insertAccountWithCodes(conn, { email: emailClean, password, backupCodes: codesTrimmed, createdBy: req.user?.id });
    if (licenseId) {
      await conn.query('UPDATE ps_plus_license_codes SET account_id = ? WHERE id = ?', [accountId, licenseId]);
      await conn.query('UPDATE ps_plus_accounts SET license_id = ? WHERE id = ?', [licenseId, accountId]);
    }

    await conn.commit();
    await audit(req, isAccountWithLicense ? 'ps_plus.account_with_license_created' : 'ps_plus.account_created', 'ps_plus_account', accountId, {
      email: emailClean,
      hasLicense: !!licenseId,
    });
    return res.status(201).json({ success: true, accountId, licenseId });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// Update account (email / status / password re-encrypt)
// ---------------------------------------------------------------------------
psPlusRoutes.put('/ps-plus/accounts/:id', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  const { email, status, password } = req.body || {};
  const errors = [];
  const allowedStatuses = ['AVAILABLE', 'RESERVED', 'SOLD', 'DISABLED', 'EXPIRED'];
  if (status !== undefined && !allowedStatuses.includes(String(status).toUpperCase())) {
    errors.push({ field: 'status', message: 'Invalid account status.' });
  }
  if (errors.length) return res.status(400).json({ success: false, errors });

  try {
    const [rows] = await pool.query('SELECT * FROM ps_plus_accounts WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Account not found' });

    const updates = [];
    const values = [];
    const emailClean = email !== undefined ? String(email).trim().toLowerCase() : undefined;
    if (emailClean !== undefined) {
      const [dup] = await pool.query('SELECT id FROM ps_plus_accounts WHERE email = ? AND id != ? LIMIT 1', [emailClean, id]);
      if (dup.length) return res.status(400).json({ success: false, error: 'Email already exists in inventory.' });
      updates.push('email = ?');
      values.push(emailClean);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(String(status).toUpperCase());
    }
    if (password !== undefined && String(password).trim() !== '') {
      const enc = encryptSecret(password);
      updates.push('password_encrypted = ?');
      values.push(enc);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update.' });
    values.push(id);
    await pool.query(`UPDATE ps_plus_accounts SET ${updates.join(', ')} WHERE id = ?`, values);

    await audit(req, 'ps_plus.account_updated', 'ps_plus_account', id, { email: emailClean });
    const detail = await getAccountDetail(id);
    return res.json({ success: true, account: accountRowSafe(detail.account) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Delete account (block if SOLD), audit first
// ---------------------------------------------------------------------------
psPlusRoutes.delete('/ps-plus/accounts/:id', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM ps_plus_accounts WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Account not found' });
    if (String(rows[0].status).toUpperCase() === 'SOLD') {
      return res.status(400).json({ success: false, error: 'Cannot delete a SOLD account. Disable it instead.' });
    }
    await audit(req, 'ps_plus.account_deleted', 'ps_plus_account', id, { email: rows[0].email });
    // license row stays (history), backup codes cascade via FK
    await pool.query('DELETE FROM ps_plus_accounts WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Reveal password (admin/manager only, audited)
// ---------------------------------------------------------------------------
psPlusRoutes.post('/ps-plus/accounts/:id/reveal-password', requireAuth, requireRoles(MANAGER_ROLES), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ps_plus_accounts WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Account not found' });
    const password = decryptSecret(rows[0].password_encrypted);
    if (password == null) {
      return res.status(500).json({ success: false, error: 'Unable to decrypt stored password. Check PS_PLUS_ENC_KEY.' });
    }
    await audit(req, 'ps_plus.password_viewed', 'ps_plus_account', req.params.id, { email: rows[0].email });
    return res.json({ success: true, password });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Backup codes lifecycle
// ---------------------------------------------------------------------------
psPlusRoutes.put('/ps-plus/backup-codes/:id/used', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM ps_plus_backup_codes WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Backup code not found.' });
    }
    const code = rows[0];
    if (String(code.status).toUpperCase() !== 'AVAILABLE') {
      await conn.rollback();
      return res.status(400).json({ success: false, error: `Backup code is already ${code.status}.` });
    }
    await conn.query(`UPDATE ps_plus_backup_codes SET status = 'USED', used_at = NOW() WHERE id = ?`, [id]);
    await conn.commit();
    await audit(req, 'ps_plus.backup_used', 'ps_plus_backup_code', id, { accountId: code.account_id });
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

psPlusRoutes.put('/ps-plus/backup-codes/:id/replace', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  const newCode = String((req.body || {}).newCode || '').trim();
  if (!newCode) return res.status(400).json({ success: false, error: 'newCode is required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM ps_plus_backup_codes WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Backup code not found.' });
    }
    const code = rows[0];
    const [exists] = await conn.query('SELECT id FROM ps_plus_backup_codes WHERE LOWER(code) = ? AND id != ? LIMIT 1', [newCode.toLowerCase(), id]);
    if (exists.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'New backup code already exists in inventory.' });
    }
    await conn.query(
      `UPDATE ps_plus_backup_codes SET code = ?, status = 'AVAILABLE', used_at = NULL WHERE id = ?`,
      [newCode, id]
    );
    await conn.commit();
    await audit(req, 'ps_plus.backup_replaced', 'ps_plus_backup_code', id, { accountId: code.account_id });
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// Licenses
// ---------------------------------------------------------------------------
psPlusRoutes.get('/ps-plus/licenses', requireAuth, READ, async (req, res) => {
  try {
    const { status } = req.query;
    const where = [];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(String(status).toUpperCase());
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT * FROM ps_plus_license_codes ${whereSql} ORDER BY created_at DESC`, params);
    return res.json({ success: true, licenses: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

psPlusRoutes.post('/ps-plus/licenses', requireAuth, WRITE, async (req, res) => {
  const codes = Array.isArray(req.body?.licenseCodes) ? req.body.licenseCodes : [];
  const trimmed = codes.map((c) => String(c || '').trim()).filter(Boolean);
  if (!trimmed.length) return res.status(400).json({ success: false, error: 'licenseCodes[] is required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const existing = await licensesExistInInventory(trimmed, conn);
    const dupes = trimmed.filter((c) => existing.has(c.toLowerCase()));
    if (dupes.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, errors: [{ field: 'licenseCodes', message: `License code already exists: ${dupes[0]}` }] });
    }
    const values = [];
    const placeholders = [];
    for (const c of trimmed) {
      values.push(c);
      placeholders.push('(?)');
    }
    const [result] = await conn.query(
      `INSERT INTO ps_plus_license_codes (license_code) VALUES ${placeholders.join(', ')}`,
      values
    );
    await conn.commit();
    await audit(req, 'ps_plus.license_created', 'ps_plus_license_code', result.insertId, { count: trimmed.length });
    return res.status(201).json({ success: true, count: trimmed.length });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

psPlusRoutes.put('/ps-plus/licenses/:id/assign', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  const { accountId } = req.body || {};
  if (!accountId) return res.status(400).json({ success: false, error: 'accountId is required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [licRows] = await conn.query('SELECT * FROM ps_plus_license_codes WHERE id = ? FOR UPDATE', [id]);
    if (!licRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'License not found.' });
    }
    if (String(licRows[0].status).toUpperCase() !== 'AVAILABLE') {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'License is not AVAILABLE.' });
    }
    const [accRows] = await conn.query('SELECT * FROM ps_plus_accounts WHERE id = ? FOR UPDATE', [accountId]);
    if (!accRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    await conn.query(
      `UPDATE ps_plus_license_codes SET account_id = ?, status = 'ASSIGNED', assigned_at = NOW() WHERE id = ?`,
      [accountId, id]
    );
    await conn.query('UPDATE ps_plus_accounts SET license_id = ? WHERE id = ?', [id, accountId]);
    await conn.commit();
    await audit(req, 'ps_plus.license_assigned', 'ps_plus_license_code', id, { accountId });
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

psPlusRoutes.put('/ps-plus/licenses/:id/remove', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [licRows] = await conn.query('SELECT * FROM ps_plus_license_codes WHERE id = ? FOR UPDATE', [id]);
    if (!licRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'License not found.' });
    }
    const license = licRows[0];
    if (String(license.status).toUpperCase() === 'USED') {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Cannot remove a USED license.' });
    }
    if (license.account_id) {
      const [accRows] = await conn.query('SELECT * FROM ps_plus_accounts WHERE id = ? FOR UPDATE', [license.account_id]);
      if (accRows.length && String(accRows[0].status).toUpperCase() === 'SOLD') {
        await conn.rollback();
        return res.status(400).json({ success: false, error: 'Cannot remove a license from a SOLD account.' });
      }
      await conn.query('UPDATE ps_plus_accounts SET license_id = NULL WHERE id = ?', [license.account_id]);
    }
    await conn.query(
      `UPDATE ps_plus_license_codes SET account_id = NULL, status = 'AVAILABLE', assigned_at = NULL WHERE id = ?`,
      [id]
    );
    await conn.commit();
    await audit(req, 'ps_plus.license_removed', 'ps_plus_license_code', id, {});
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

psPlusRoutes.delete('/ps-plus/licenses/:id', requireAuth, WRITE, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM ps_plus_license_codes WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'License not found.' });
    if (String(rows[0].status).toUpperCase() === 'USED') {
      return res.status(400).json({ success: false, error: 'Cannot delete a USED license.' });
    }
    await audit(req, 'ps_plus.license_deleted', 'ps_plus_license_code', id, { code: rows[0].license_code });
    await pool.query('DELETE FROM ps_plus_license_codes WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Bulk import (validate entire dataset before commit)
// ---------------------------------------------------------------------------
psPlusRoutes.post('/ps-plus/import', requireAuth, WRITE, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ success: false, error: 'rows[] is required.' });

  const report = { valid: 0, invalid: 0, invalidRows: [] };
  const cleanRows = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const errors = [];
    const email = String(r.email || '').trim().toLowerCase();
    const password = String(r.password || '');
    const codes = [];
    for (let c = 1; c <= BACKUP_CODE_COUNT; c++) {
      const v = r[`backupCode${String(c).padStart(2, '0')}`];
      if (v !== undefined && v !== null && String(v).trim() !== '') codes.push(String(v).trim());
    }
    const licenseCode = r.licenseCode ? String(r.licenseCode).trim() : '';

    if (!email) errors.push({ field: 'email', message: 'Email is required.' });
    if (!password) errors.push({ field: 'password', message: 'Password is required.' });
    if (codes.length !== BACKUP_CODE_COUNT) {
      errors.push({ field: 'backupCodes', message: `Exactly ${BACKUP_CODE_COUNT} backup codes are required (received ${codes.length}).` });
    }
    const seen = new Set();
    for (const c of codes) {
      const key = c.toLowerCase();
      if (seen.has(key)) {
        errors.push({ field: 'backupCodes', message: `Duplicate backup code "${c}" in row.` });
      }
      seen.add(key);
    }

    if (errors.length) {
      report.invalid += 1;
      report.invalidRows.push({ row: i + 1, errors });
    } else {
      report.valid += 1;
      cleanRows.push({ email, password, backupCodes: codes, licenseCode });
    }
  }

  // Global cross-row + DB-existence validation
  if (report.invalid === 0) {
    const emailSet = new Set();
    const allCodes = [];
    const allLicenses = [];
    for (const cr of cleanRows) {
      if (emailSet.has(cr.email)) {
        report.invalid += 1;
        report.invalidRows.push({ row: 0, errors: [{ field: 'email', message: `Duplicate email across rows: ${cr.email}` }] });
        break;
      }
      emailSet.add(cr.email);
      allCodes.push(...cr.backupCodes);
      if (cr.licenseCode) allLicenses.push(cr.licenseCode);
    }
    if (report.invalid === 0) {
      const codeSet = new Set(allCodes.map((c) => c.toLowerCase()));
      if (codeSet.size !== allCodes.length) {
        report.invalid += 1;
        report.invalidRows.push({ row: 0, errors: [{ field: 'backupCodes', message: 'Duplicate backup codes across rows.' }] });
      }
    }
    if (report.invalid === 0) {
      const licSet = new Set(allLicenses.map((c) => c.toLowerCase()));
      if (licSet.size !== allLicenses.length) {
        report.invalid += 1;
        report.invalidRows.push({ row: 0, errors: [{ field: 'licenseCode', message: 'Duplicate license codes across rows.' }] });
      }
    }
  }

  if (report.invalid === 0) {
    try {
      const existingCodes = await codesExistInInventory(allCodes);
      const existingLic = allLicenses.length ? await licensesExistInInventory(allLicenses) : new Set();
      const conflictCodes = allCodes.filter((c) => existingCodes.has(c.toLowerCase()));
      const conflictLic = allLicenses.filter((c) => existingLic.has(c.toLowerCase()));
      if (conflictCodes.length || conflictLic.length) {
        report.invalid += 1;
        report.invalidRows.push({
          row: 0,
          errors: [
            ...(conflictCodes.length ? [{ field: 'backupCodes', message: `Backup code already in inventory: ${conflictCodes[0]}` }] : []),
            ...(conflictLic.length ? [{ field: 'licenseCode', message: `License code already in inventory: ${conflictLic[0]}` }] : []),
          ],
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // If anything is invalid, do NOT commit.
  if (report.invalid > 0) {
    report.valid = cleanRows.length - 1 >= 0 ? report.valid : 0; // keep display consistent
    return res.status(400).json({ success: false, report });
  }

  const conn = await pool.getConnection();
  let created = 0;
  try {
    await conn.beginTransaction();
    for (const cr of cleanRows) {
      let licenseId = null;
      if (cr.licenseCode) {
        const [licRes] = await conn.query(
          `INSERT INTO ps_plus_license_codes (license_code, status) VALUES (?, 'ASSIGNED')`,
          [cr.licenseCode]
        );
        licenseId = licRes.insertId;
      }
      const accountId = await insertAccountWithCodes(conn, { email: cr.email, password: cr.password, backupCodes: cr.backupCodes, createdBy: req.user?.id });
      if (licenseId) {
        await conn.query('UPDATE ps_plus_license_codes SET account_id = ? WHERE id = ?', [accountId, licenseId]);
        await conn.query('UPDATE ps_plus_accounts SET license_id = ? WHERE id = ?', [licenseId, accountId]);
      }
      created += 1;
    }
    await conn.commit();
    await audit(req, 'ps_plus.bulk_import', 'ps_plus_account', null, { created });
    return res.status(201).json({ success: true, created, report: { valid: report.valid, invalid: 0, invalidRows: [] } });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// Order lookup + Mark Sold (links the account record to an order)
// ---------------------------------------------------------------------------
psPlusRoutes.get('/ps-plus/orders/lookup', requireAuth, WRITE, async (req, res) => {
  try {
    const q = String(req.query.order_number || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'order_number is required.' });
    const [rows] = await pool.query(
      'SELECT id, order_number, customer_name, customer_email, amount, status, date FROM orders WHERE order_number = ? OR id = ? LIMIT 1',
      [q, q]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
    return res.json({ success: true, order: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

psPlusRoutes.post('/ps-plus/accounts/:id/mark-sold', requireAuth, requireRoles(MANAGER_ROLES), async (req, res) => {
  const { id } = req.params;
  const orderNumber = String((req.body || {}).order_number || '').trim();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM ps_plus_accounts WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    const account = rows[0];
    const status = String(account.status).toUpperCase();
    if (status !== 'AVAILABLE' && status !== 'RESERVED') {
      await conn.rollback();
      return res.status(400).json({ success: false, error: `Account is already ${account.status}.` });
    }

    let orderId = null;
    let buyerName = null;
    let buyerEmail = null;
    if (orderNumber) {
      const [orderRows] = await pool.query(
        'SELECT * FROM orders WHERE order_number = ? OR id = ? LIMIT 1 FOR UPDATE',
        [orderNumber, orderNumber]
      );
      if (!orderRows.length) {
        await conn.rollback();
        return res.status(404).json({ success: false, error: `Order "${orderNumber}" not found.` });
      }
      const order = orderRows[0];
      orderId = order.id;
      buyerName = order.customer_name || null;
      buyerEmail = order.customer_email || null;

      // Reference the account on the order (snapshot kept for email/legacy)
      let delivery = [];
      try {
        delivery = order.digital_delivery ? JSON.parse(order.digital_delivery) : [];
      } catch {
        delivery = [];
      }
      if (!Array.isArray(delivery)) delivery = [];
      let licenseCode = null;
      if (account.license_id) {
        const [licRows] = await conn.query('SELECT license_code FROM ps_plus_license_codes WHERE id = ? LIMIT 1', [account.license_id]);
        licenseCode = licRows[0]?.license_code || null;
      }
      delivery.push({ psPlusAccountId: id, email: account.email, licenseCode });
      await conn.query(
        `UPDATE orders SET inventory_id = ?, digital_delivery = ? WHERE id = ?`,
        [String(id), JSON.stringify(delivery), orderId]
      );
    }

    await conn.query(`UPDATE ps_plus_accounts SET status = 'SOLD' WHERE id = ?`, [id]);
    if (account.license_id) {
      await conn.query(`UPDATE ps_plus_license_codes SET status = 'USED' WHERE id = ?`, [account.license_id]);
    }

    await conn.commit();
    await audit(req, 'ps_plus.account_sold', 'ps_plus_account', id, { orderId, orderNumber, buyerEmail });
    return res.json({ success: true, orderId, buyerName, buyerEmail });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------
psPlusRoutes.get('/ps-plus/audit', requireAuth, requireRoles(MANAGER_ROLES), async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    const where = [];
    const params = [];
    if (entityType) {
      where.push('entity_type = ?');
      params.push(String(entityType));
    }
    if (entityId) {
      where.push('entity_id = ?');
      params.push(String(entityId));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT id, user_id, user_email, action, entity_type, entity_id, metadata, ip_address, created_at
       FROM audit_log ${whereSql} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    return res.json({ success: true, items: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
