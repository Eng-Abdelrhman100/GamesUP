import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { adminRouter } from './admin/routes/index.js';
import { apiRouter } from './routes/index.js';
import { pool } from './db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT ? Number.parseInt(String(process.env.PORT), 10) : 5174;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

app.use('/admin', adminRouter);
app.use('/api', apiRouter);

const defaultHomepageCategories = [
  {
    id: 'rpg',
    title: 'ACTION & ADVENTURE RPG',
    desc: 'Elite RPG titles and high-immersive adventure protocols.',
    image: 'https://images.unsplash.com/photo-1605898399789-19794336e181?q=80&w=1000&auto=format&fit=crop',
    icon: 'Swords',
    count: '24 ASSETS',
  },
  {
    id: 'sports',
    title: 'SPORTS & RACING',
    desc: 'Peak performance required. Master the field and the track.',
    image: 'https://images.unsplash.com/photo-1547941126-3d5322b218b0?q=80&w=1000&auto=format&fit=crop',
    icon: 'Zap',
    count: '18 ASSETS',
  },
  {
    id: 'shooter',
    title: 'WARFARE & FPS',
    desc: 'Tactical dominance. High-precision assets for elite operators.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
    icon: 'Target',
    count: '32 ASSETS',
  },
  {
    id: 'horror',
    title: 'HORROR & SURVIVAL',
    desc: 'Nightmare scenarios. Survival is the only objective.',
    image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1000&auto=format&fit=crop',
    icon: 'Shield',
    count: '12 ASSETS',
  },
];

const defaultAccountSlotAttributes = [
  { name: 'Primary PS4', type: 'text', display_order: 1 },
  { name: 'Primary PS5', type: 'text', display_order: 2 },
  { name: 'Secondary', type: 'text', display_order: 3 },
  { name: 'Offline PS4', type: 'text', display_order: 4 },
  { name: 'Offline PS5', type: 'text', display_order: 5 },
];

async function ensureGameRequestsTableExists() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS game_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      region VARCHAR(64) NULL,
      account_type VARCHAR(64) NULL,
      notes TEXT NULL,
      image_url VARCHAR(512) NULL,
      customer_name VARCHAR(255) NULL,
      customer_email VARCHAR(255) NULL,
      customer_phone VARCHAR(64) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_created (status, created_at),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

async function ensureProductAttributesSeeded() {
  const [rows] = await pool.query('SELECT name FROM product_attributes');
  const existingNames = new Set((rows || []).map((r) => String(r.name || '').trim().toLowerCase()).filter(Boolean));
  const missing = defaultAccountSlotAttributes.filter((a) => !existingNames.has(a.name.toLowerCase()));
  if (!missing.length) return;

  const values = [];
  const placeholders = missing
    .map((a) => {
      values.push(a.name, a.type, null, false, a.display_order, true);
      return '(?, ?, ?, ?, ?, ?)';
    })
    .join(', ');

  await pool.query(
    `INSERT INTO product_attributes (name, type, options, is_required, display_order, is_active)
     VALUES ${placeholders}`,
    values
  );
}

async function ensureHomepageCategoriesSeeded() {
  const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', ['homepage_categories']);
  const existing = rows?.[0]?.setting_value;
  const existingTrimmed = typeof existing === 'string' ? existing.trim() : '';

  if (!existingTrimmed || existingTrimmed === '[]') {
    await pool.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['homepage_categories', JSON.stringify(defaultHomepageCategories)],
    );
  }
}

async function bootstrap() {
  await ensureGameRequestsTableExists();
  await ensureProductAttributesSeeded();
  await ensureHomepageCategoriesSeeded();
  app.listen(port, () => {
    console.log(`API Server running at http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
