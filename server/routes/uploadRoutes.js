import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Router } from 'express';
import { requireRoles } from '../middleware/authMiddleware.js';

export const uploadRoutes = Router();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function createStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'server', 'uploads', subdir);
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
const chatUpload = multer({ storage: createStorage('chat_images') });
const paymentProofUpload = multer({ storage: createStorage('payment_proofs') });

uploadRoutes.post('/uploads/products', requireRoles(['admin', 'manager']), productsUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/products/${req.file.filename}`;
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
