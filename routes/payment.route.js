import express from 'express';
import { asyncHandler } from '../middlewares/trycatch.js';
import { isAuth } from '../middlewares/auth.js';
import { 
  createPaymentOrder, 
  verifyPaymentAndGenerateInvoice, 
  handleRazorpayWebhook 
} from '../controllers/payment.controller.js';

const router = express.Router();

// Create Razorpay order for payment
router.post('/create', isAuth, asyncHandler(createPaymentOrder));

// Verify payment and generate invoice
router.post('/verify', isAuth, asyncHandler(verifyPaymentAndGenerateInvoice));

// Razorpay webhook (no auth required - called by Razorpay)
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(handleRazorpayWebhook));

export default router;
