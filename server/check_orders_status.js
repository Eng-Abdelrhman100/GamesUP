import { pool } from './db/pool.js';

async function main() {
  try {
    const [orders] = await pool.query('SELECT id, order_number, product_name, status, digital_email, digital_password, digital_code, digital_delivery FROM orders ORDER BY id DESC LIMIT 5');
    console.log('--- LATEST ORDERS ---');
    console.log(JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
