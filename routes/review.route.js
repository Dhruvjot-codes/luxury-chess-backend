import express from 'express';
import { asyncHandler } from '../middlewares/trycatch.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';
import { uploadSingleFile, uploadMultipleFiles, multerErrorHandler } from '../middlewares/multer.js';
import {
  createReview,
  listApprovedReviewsForCard,
  listPendingReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from '../controllers/review.controller.js';

const router = express.Router();

// Public: get approved reviews for a specific card
router.get('/card/:cardId', asyncHandler(listApprovedReviewsForCard));

// Create review (auth required) — allow multiple photos
router.post('/', isAuth, uploadMultipleFiles, multerErrorHandler, asyncHandler(createReview));

// Admin: manage reviews
router.get('/admin/pending', isAuth, isAdmin, asyncHandler(listPendingReviews));
router.patch('/admin/:id/approve', isAuth, isAdmin, asyncHandler(approveReview));
router.patch('/admin/:id/reject', isAuth, isAdmin, asyncHandler(rejectReview));
router.delete('/admin/:id', isAuth, isAdmin, asyncHandler(deleteReview));

export default router;
