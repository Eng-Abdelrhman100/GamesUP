import crypto from 'crypto';

// Deterministic key derivation when PS_PLUS_ENC_KEY is not configured. This keeps the
// server bootable without extra env for local dev, but a dedicated 32-byte key should
// be set in production via PS_PLUS_ENC_KEY (base64) so secrets are not derived from the
// JWT secret alone.
let cachedKey = null;
let warned = false;

function getKey() {
  if (cachedKey) return cachedKey;
  const configured = process.env.PS_PLUS_ENC_KEY;
  if (configured) {
    // Accept either 32 raw bytes (base64) or a plain 32-char key string.
    let buf;
    try {
      buf = Buffer.from(configured, 'base64');
    } catch {
      buf = null;
    }
    if (buf && buf.length === 32) {
      cachedKey = buf;
      return cachedKey;
    }
    if (Buffer.byteLength(configured, 'utf8') === 32) {
      cachedKey = Buffer.from(configured, 'utf8');
      return cachedKey;
    }
  }
  if (!warned) {
    console.warn('[ps-plus] PS_PLUS_ENC_KEY not set — deriving encryption key from JWT_SECRET (dev fallback). Set PS_PLUS_ENC_KEY to a 32-byte value in production.');
    warned = true;
  }
  const jwtSecret = process.env.JWT_SECRET || 'gamesup-dev-secret';
  cachedKey = crypto.createHash('sha256').update(jwtSecret).digest();
  return cachedKey;
}

// Encrypt a secret with AES-256-GCM. Returns "iv:authTag:ciphertext" base64 payload.
export function encryptSecret(plaintext) {
  if (plaintext == null || plaintext === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(payload) {
  if (!payload) return null;
  const parts = String(payload).split(':');
  if (parts.length !== 3) return null;
  const [ivB64, tagB64, dataB64] = parts;
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
