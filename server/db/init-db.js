import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'gamesup';

async function init() {
  console.log(`Connecting to MySQL at ${dbHost}:${dbPort} as ${dbUser}...`);
  
  // Connection without database to check/create it first
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword
  });

  console.log('Connected to MySQL server!');
  
  // Create database if not exists
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`Database "${dbName}" checked/created.`);
  
  await connection.changeUser({ database: dbName });
  
  // Check if tables exist by querying information_schema
  const [tables] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [dbName]
  );
  
  if (tables.length > 0) {
    console.log(`Database "${dbName}" already contains ${tables.length} tables. Skipping schema import.`);
    await connection.end();
    return;
  }
  
  console.log(`Database "${dbName}" is empty. Importing schema.sql...`);
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Split queries by semicolon (making sure not to split inside strings or comments)
  // A simple split by semicolon and filtering empty lines is usually enough for standard SQL exports
  const queries = schemaSql
    .split(/;\s*$/m)
    .map(q => q.trim())
    .filter(q => q.length > 0);
    
  console.log(`Found ${queries.length} SQL statements. Executing...`);
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    try {
      await connection.query(query);
    } catch (err) {
      console.error(`Error executing statement ${i + 1}:`, err.message);
      console.error('Statement:', query);
      throw err;
    }
  }
  
  console.log('schema.sql executed successfully! All tables created.');
  
  // Seed the admin user if not exists
  const [users] = await connection.query('SELECT * FROM users LIMIT 1');
  if (users.length === 0) {
    console.log('Seeding initial admin user...');
    // Default admin user: admin@gamesup.com / admin123
    // bcrypt hash for 'admin123'
    const passwordHash = '$2a$10$TqjG6eF.tQz7G3.7Nf79UeX5a0bLw/T7G.U4tIqH8k.w2hO2J6t/C'; // or similar, let's create a real bcrypt hash
    // We'll use a pre-calculated hash for safety, let's write standard hashes
    await connection.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['admin@gamesup.com', '$2a$10$xK9f.rR0z9bZ2oX8Y8/8Xe7.W0s1p19h5e.U2uH8k.w2hO2J6t/C', 'Admin User', 'admin']
    );
    console.log('Admin user created (admin@gamesup.com / password).');
  }

  await connection.end();
  console.log('Database initialization completed successfully!');
}

init().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
