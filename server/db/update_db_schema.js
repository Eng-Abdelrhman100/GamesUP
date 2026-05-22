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

  await connection.end();
}

main().catch(console.error);
