import express from 'express';
import { asyncHandler } from '../middlewares/trycatch.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';
import {
  createOrderRequest,
  listPendingOrderRequests,
  acceptOrderRequest,
  getUserOrders,
  getUserOrderRequests,
  rejectOrderRequest,
  updateOrderStatus,
  getOrderDetails,
  createRazorpayPayment,
  verifyRazorpayPayment,
  cancelOrder,
  cancelOrderByAdmin
} from '../controllers/order.controller.js';

const router = express.Router();

// User: create order request (click 'Get Order' on a card)
router.post('/', isAuth, asyncHandler(createOrderRequest));

// User: get own submitted order requests combining pending and others
router.get('/requests/me', isAuth, asyncHandler(getUserOrderRequests));

// User: get own approved orders
router.get('/me', isAuth, asyncHandler(getUserOrders));

// Admin: list pending requests
router.get('/admin/pending', isAuth, isAdmin, asyncHandler(listPendingOrderRequests));

// Admin: accept request -> creates an order
router.post('/admin/:id/accept', isAuth, isAdmin, asyncHandler(acceptOrderRequest));

// Admin: reject request
router.post('/admin/:id/reject', isAuth, isAdmin, asyncHandler(rejectOrderRequest));

// Admin: cancel order directly
router.post('/admin/:id/cancel', isAuth, isAdmin, asyncHandler(cancelOrderByAdmin));

// User: get order details with tracking
router.get('/:id', isAuth, asyncHandler(getOrderDetails));

// Admin: update order status
router.put('/admin/:id/status', isAuth, isAdmin, asyncHandler(updateOrderStatus));

// User: cancel order (only before payment)
router.post('/:id/cancel', isAuth, asyncHandler(cancelOrder));

// Payment: create Razorpay order for full payment
router.post('/:id/create-payment', isAuth, asyncHandler(createRazorpayPayment));
router.post('/:id/verify-payment', isAuth, asyncHandler(verifyRazorpayPayment));

export default router;
