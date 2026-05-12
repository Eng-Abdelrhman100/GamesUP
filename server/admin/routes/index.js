import { Router } from 'express';
import { isAdmin } from '../middleware/isAdmin.js';

export const adminRouter = Router();

adminRouter.use(isAdmin);
