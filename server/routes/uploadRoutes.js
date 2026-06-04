import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Router } from 'express';
import { requireRoles, requirePermission } from '../middleware/authMiddleware.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadRoutes = Router();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function createStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', 'uploads', subdir);
      ensureDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const safeName = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
      cb(null, `${Date.now()}-${safeName}`);
    },
  });
}

const productsUpload = multer({ storage: createStorage('products') });
const bannersUpload = multer({ storage: createStorage('banners') });
const chatUpload = multer({ storage: createStorage('chat_images') });
const paymentProofUpload = multer({ storage: createStorage('payment_proofs') });
const requestImagesUpload = multer({
  storage: createStorage('request_images'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file && typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed'));
  },
});

uploadRoutes.post('/uploads/products', requirePermission('products', 'write'), productsUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/products/${req.file.filename}`;
  return res.json({ url });
});

uploadRoutes.post('/uploads/banners', requirePermission('banners', 'write'), bannersUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/banners/${req.file.filename}`;
  return res.json({ url });
});

uploadRoutes.post('/uploads/request-images', requestImagesUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/request_images/${req.file.filename}`;
  return res.json({ url });
});

uploadRoutes.post('/uploads/chat-images', requireRoles(['customer', 'admin', 'manager', 'staff']), chatUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/chat_images/${req.file.filename}`;
  return res.json({ url });
});

uploadRoutes.post('/uploads/payment-proofs', paymentProofUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/payment_proofs/${req.file.filename}`;
  return res.json({ url });
});
