import { Router } from 'express';
import { createOrder, listMyOrders } from '../controllers/orderController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Only logged-in users can create and view their orders
router.post('/', requireAuth, createOrder);
router.get('/mine', requireAuth, listMyOrders);

export default router;
