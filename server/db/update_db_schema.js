import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gamesup',
  });

  console.log('Connected to DB successfully.');

  // 1. Check if orders table has 'phone' column
  const [orderColumns] = await connection.query('SHOW COLUMNS FROM orders LIKE "phone"');
  if (orderColumns.length === 0) {
    console.log('Adding "phone" column to orders table...');
    await connection.query('ALTER TABLE orders ADD COLUMN phone VARCHAR(64) NULL AFTER customer_email');
    console.log('"phone" column added successfully.');
  } else {
    console.log('"phone" column already exists in orders table.');
  }

  // 2. Check if products table has 'instructions' column
  const [productColumns] = await connection.query('SHOW COLUMNS FROM products LIKE "instructions"');
  if (productColumns.length === 0) {
    console.log('Adding "instructions" column to products table...');
    await connection.query('ALTER TABLE products ADD COLUMN instructions TEXT NULL AFTER `purchasedPassword`');
    console.log('"instructions" column added successfully.');
  } else {
    console.log('"instructions" column already exists in products table.');
  }

  // 2b. Check if products table has 'digital_game_type' column
  const [digitalGameTypeCols] = await connection.query('SHOW COLUMNS FROM products LIKE "digital_game_type"');
  if (digitalGameTypeCols.length === 0) {
    console.log('Adding "digital_game_type" column to products table...');
    await connection.query('ALTER TABLE products ADD COLUMN digital_game_type VARCHAR(32) NOT NULL DEFAULT "normal" AFTER emailTemplate');
    console.log('"digital_game_type" column added successfully.');
  } else {
    console.log('"digital_game_type" column already exists in products table.');
  }

  // 3. Check if orders table has 'cost' column
  const [costColumns] = await connection.query('SHOW COLUMNS FROM orders LIKE "cost"');
  if (costColumns.length === 0) {
    console.log('Adding "cost" column to orders table...');
    await connection.query('ALTER TABLE orders ADD COLUMN cost DECIMAL(10, 2) NULL AFTER shipping_address');
    console.log('"cost" column added successfully.');
  } else {
    console.log('"cost" column already exists in orders table.');
  }

  // 3b. Check if categories table has 'email_rules' column
  const [catEmailRulesCols] = await connection.query('SHOW COLUMNS FROM categories LIKE "email_rules"');
  if (catEmailRulesCols.length === 0) {
    console.log('Adding "email_rules" column to categories table...');
    await connection.query('ALTER TABLE categories ADD COLUMN email_rules TEXT NULL AFTER is_active');
    console.log('"email_rules" column added successfully.');
  } else {
    console.log('"email_rules" column already exists in categories table.');
  }

  // 4. Create balance_inventory table
  console.log('Checking "balance_inventory" table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS balance_inventory (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(191) NOT NULL,
      password TEXT NULL,
      birthdate DATE NULL,
      outlook_email VARCHAR(191) NULL,
      outlook_password TEXT NULL,
      dollar_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
      dollar_to_egp_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_balance_inventory_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('"balance_inventory" table checked/created successfully.');

  // 5. Create sub_sub_categories table
  console.log('Checking "sub_sub_categories" table...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS sub_sub_categories (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('"sub_sub_categories" table checked/created successfully.');

  await connection.end();
}

main().catch(console.error);
