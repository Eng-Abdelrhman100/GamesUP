import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

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

  // 2c. Check if products table has 'showOutOfStockBadge' column
  const [showBadgeCols] = await connection.query('SHOW COLUMNS FROM products LIKE "showOutOfStockBadge"');
  if (showBadgeCols.length === 0) {
    console.log('Adding "showOutOfStockBadge" column to products table...');
    await connection.query('ALTER TABLE products ADD COLUMN showOutOfStockBadge BOOLEAN NOT NULL DEFAULT TRUE AFTER digital_game_type');
    console.log('"showOutOfStockBadge" column added successfully.');
  } else {
    console.log('"showOutOfStockBadge" column already exists in products table.');
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
      activation_codes TEXT NULL,
      dollar_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
      dollar_to_egp_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY idx_balance_inventory_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('"balance_inventory" table checked/created successfully.');

  // 4b. Check if balance_inventory table has 'activation_codes' column
  const [balanceInvColumns] = await connection.query('SHOW COLUMNS FROM balance_inventory LIKE "activation_codes"');
  if (balanceInvColumns.length === 0) {
    console.log('Adding "activation_codes" column to balance_inventory table...');
    await connection.query('ALTER TABLE balance_inventory ADD COLUMN activation_codes TEXT NULL AFTER outlook_password');
    console.log('"activation_codes" column added successfully.');
  } else {
    console.log('"activation_codes" column already exists in balance_inventory table.');
  }

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

  // 6. Create account finance tables
  const ensureAccountCostTables = async (conn) => {
    // account_costs — permanent acquisition cost basis per digital item
    await conn.query(`
      CREATE TABLE IF NOT EXISTS account_costs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        product_id BIGINT UNSIGNED NOT NULL,
        digital_item_id CHAR(36) NOT NULL,
        acquisition_type ENUM('purchased','created_from_balance','legacy','unknown') NOT NULL DEFAULT 'unknown',
        acquisition_cost DECIMAL(10, 2) NULL,
        source_balance_id BIGINT UNSIGNED NULL,
        source_balance_email VARCHAR(191) NULL,
        reference_note VARCHAR(191) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_account_cost_item (product_id, digital_item_id),
        KEY idx_account_costs_product (product_id),
        KEY idx_account_costs_type (acquisition_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // account_sales — each sold slot-code is one auditable sale transaction
    await conn.query(`
      CREATE TABLE IF NOT EXISTS account_sales (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        account_sale_id CHAR(36) NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        digital_item_id CHAR(36) NOT NULL,
        slot_name VARCHAR(191) NOT NULL,
        order_id BIGINT UNSIGNED NULL,
        order_number VARCHAR(191) NULL,
        buyer_name VARCHAR(191) NULL,
        buyer_email VARCHAR(191) NULL,
        sale_price DECIMAL(10, 2) NULL,
        sale_date DATETIME(3) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        is_full_account TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_account_sale_ref (digital_item_id, slot_name, order_number),
        KEY idx_account_sales_item (product_id, digital_item_id),
        KEY idx_account_sales_order (order_id),
        KEY idx_account_sales_created (sale_date, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // balance_usage — ledger of funds drawn from a balance_inventory source
    await conn.query(`
      CREATE TABLE IF NOT EXISTS balance_usage (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        balance_id BIGINT UNSIGNED NOT NULL,
        balance_email VARCHAR(191) NULL,
        product_id BIGINT UNSIGNED NULL,
        digital_item_id CHAR(36) NULL,
        quantity INT NOT NULL DEFAULT 1,
        amount_used DECIMAL(10, 2) NULL,
        cost_per_account DECIMAL(10, 2) NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_balance_usage_balance (balance_id),
        KEY idx_balance_usage_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  };

  console.log('Checking "account_costs", "account_sales", "balance_usage" tables...');
  await ensureAccountCostTables(connection);
  console.log('"account_costs", "account_sales", "balance_usage" tables checked/created successfully.');

  await connection.end();
}

main().catch(console.error);
