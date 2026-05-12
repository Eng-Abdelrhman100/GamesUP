import mysql from 'mysql2/promise';

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const dbPort = process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 3306;

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: false,
  decimalNumbers: true,
});

