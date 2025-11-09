import { Router } from 'express';
import { createOrder, listMyOrders, listAllOrders, updateOrderStatus } from '../controllers/orderController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Only logged-in users can create and view their orders
router.post('/', requireAuth, createOrder);
router.get('/mine', requireAuth, listMyOrders);
// Admin/Seller management
router.get('/', requireAuth, requireRole(['admin','seller']), listAllOrders);
router.patch('/:id/status', requireAuth, requireRole(['admin','seller']), updateOrderStatus);

export default router;
