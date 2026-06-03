import './init-log.js';
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

const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

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

async function ensureSubSubCategoriesTableExists() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS sub_sub_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sub_category_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(191) NOT NULL,
      slug VARCHAR(191) NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_sub_sub_categories_sub_category_id (sub_category_id),
      KEY idx_sub_sub_categories_active_order (is_active, display_order),
      CONSTRAINT fk_sub_sub_categories_sub_category
        FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
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

async function ensureSystemCategoriesSeeded() {
  const defaultSystemCategories = [
    { name: 'Consoles', slug: 'consoles', icon: '🎮', display_order: 1, is_active: true },
    { name: 'Digital Games', slug: 'digital-games', icon: '🎯', display_order: 2, is_active: true },
    { name: 'Accessories', slug: 'accessories', icon: '🎧', display_order: 3, is_active: true },
    { name: 'Gift Cards', slug: 'gift-cards', icon: '💳', display_order: 4, is_active: true },
    { name: 'Playstation Plus Subscriptions', slug: 'playstation-plus', icon: '➕', display_order: 5, is_active: true }
  ];

  const [rows] = await pool.query('SELECT slug FROM categories');
  const existingSlugs = new Set((rows || []).map(r => String(r.slug || '').trim().toLowerCase()));
  
  for (const cat of defaultSystemCategories) {
    if (!existingSlugs.has(cat.slug.toLowerCase())) {
      console.log(`Seeding system category: ${cat.name}`);
      await pool.query(
        'INSERT INTO categories (name, slug, icon, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
        [cat.name, cat.slug, cat.icon, cat.display_order, cat.is_active]
      );
    }
  }

  // Seed subcategories for Playstation Plus
  const [psPlusRows] = await pool.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', ['playstation-plus']);
  if (psPlusRows.length > 0) {
    const categoryId = psPlusRows[0].id;
    const defaultSubCategories = [
      { category_id: categoryId, name: 'Essential', slug: 'essential', display_order: 1, is_active: true },
      { category_id: categoryId, name: 'Extra', slug: 'extra', display_order: 2, is_active: true },
      { category_id: categoryId, name: 'Deluxe', slug: 'deluxe', display_order: 3, is_active: true }
    ];

    const durations = [
      { name: '1 Month', slug: '1-month', display_order: 1 },
      { name: '3 Months', slug: '3-months', display_order: 2 },
      { name: '1 Year', slug: '1-year', display_order: 3 }
    ];

    for (const sub of defaultSubCategories) {
      let subCategoryId;
      const [subRows] = await pool.query('SELECT id FROM sub_categories WHERE category_id = ? AND slug = ? LIMIT 1', [categoryId, sub.slug]);
      
      if (subRows.length === 0) {
        console.log(`Seeding subcategory: ${sub.name} for Playstation Plus`);
        const [result] = await pool.query(
          'INSERT INTO sub_categories (category_id, name, slug, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
          [sub.category_id, sub.name, sub.slug, sub.display_order, sub.is_active]
        );
        subCategoryId = result.insertId;
      } else {
        subCategoryId = subRows[0].id;
      }

      // Seed sub-sub-categories (Durations)
      for (const dur of durations) {
        const [ssRows] = await pool.query('SELECT id FROM sub_sub_categories WHERE sub_category_id = ? AND slug = ? LIMIT 1', [subCategoryId, dur.slug]);
        if (ssRows.length === 0) {
          console.log(`Seeding sub-sub-category: ${dur.name} for ${sub.name}`);
          await pool.query(
            'INSERT INTO sub_sub_categories (sub_category_id, name, slug, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [subCategoryId, dur.name, dur.slug, dur.display_order, true]
          );
        }
      }
    }
  }
}

async function bootstrap() {
  // Test database connectivity first
  try {
    await pool.query('SELECT 1');
    console.log('Database connection successful');
  } catch (dbErr) {
    console.error('CRITICAL: Database connection failed:', dbErr.message);
    console.error('Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in server/.env');
    throw dbErr; // This IS fatal — no DB means no working API
  }

  // Seed operations — each is optional, failures should not crash the server
  const seedSteps = [
    { name: 'game_requests table', fn: ensureGameRequestsTableExists },
    { name: 'sub_sub_categories table', fn: ensureSubSubCategoriesTableExists },
    { name: 'product attributes', fn: ensureProductAttributesSeeded },
    { name: 'homepage categories', fn: ensureHomepageCategoriesSeeded },
    { name: 'system categories', fn: ensureSystemCategoriesSeeded },
  ];

  for (const step of seedSteps) {
    try {
      await step.fn();
    } catch (seedErr) {
      console.error(`Warning: Failed to seed ${step.name}:`, seedErr.message);
      try {
        const fs = await import('fs');
        const logPath = path.join(__dirname, '..', 'dist', 'error_log.txt');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] SEED WARNING (${step.name}): ${seedErr.message}\n`, 'utf8');
      } catch (_) { /* ignore logging failure */ }
    }
  }

  app.listen(port, async () => {
    console.log(`API Server running at http://localhost:${port}`);
    try {
      const fs = await import('fs');
      const logPath = path.join(__dirname, '..', 'dist', 'error_log.txt');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Server successfully listening on port ${port}\n`, 'utf8');
    } catch (e) {
      console.error('Failed to write startup confirmation:', e);
    }
  });
}

bootstrap().catch(async (err) => {
  console.error('Failed to start API server:', err);
  try {
    const fs = await import('fs');
    const logPath = path.join(__dirname, '..', 'dist', 'error_log.txt');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] CRITICAL STARTUP FAILURE:\n${err && err.stack ? err.stack : err}\n\n`, 'utf8');
  } catch (e) {
    console.error('Failed to write startup failure:', e);
  }
  process.exit(1);
});

