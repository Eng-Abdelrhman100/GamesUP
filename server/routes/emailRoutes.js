import { Router } from 'express';
import { sendEmail } from '../controllers/emailController.js';

export const emailRoutes = Router();

emailRoutes.post('/send-email', sendEmail);
