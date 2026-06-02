import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, '..', 'dist', 'error_log.txt');

function writeError(err) {
  try {
    const time = new Date().toISOString();
    const message = `[${time}] UNCAUGHT ERROR:\n${err && err.stack ? err.stack : err}\n\n`;
    fs.appendFileSync(logPath, message, 'utf8');
  } catch (e) {
    console.error('Failed to write to error_log.txt:', e);
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  writeError(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  writeError(reason);
  // Don't exit — let the server continue running for other requests
});

// Write a clean start entry
try {
  const time = new Date().toISOString();
  // Ensure directory exists
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(logPath, `[${time}] Node server startup sequence initiated...\n`, 'utf8');
} catch (e) {
  console.error('Failed to initialize error_log.txt:', e);
}
