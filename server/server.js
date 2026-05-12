import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { adminRouter } from './admin/routes/index.js';
import { apiRouter } from './routes/index.js';

const app = express();
const port = process.env.PORT ? Number.parseInt(String(process.env.PORT), 10) : 3005;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

app.use('/admin', adminRouter);
app.use('/api', apiRouter);

// Start the server
app.listen(port, () => {
  console.log(`API Server running at http://localhost:${port}`);
});
