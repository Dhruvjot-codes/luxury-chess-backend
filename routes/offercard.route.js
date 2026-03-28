import express from 'express';
import {
  createOfferCard,
  listOfferCards,
  getOfferCard,
  getActiveOffers,
  updateOfferCard,
  deleteOfferCard,
  toggleOfferStatus,
} from '../controllers/offercard.controller.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/trycatch.js';
import { uploadSingleFile, multerErrorHandler } from '../middlewares/multer.js';

const router = express.Router();

// Public endpoints
router.get('/', asyncHandler(listOfferCards));
router.get('/active', asyncHandler(getActiveOffers));
router.get('/:id', asyncHandler(getOfferCard));

// Admin-protected endpoints (requires auth and admin role)
// Create offer card with photo upload
router.post('/', isAuth, isAdmin, uploadSingleFile, multerErrorHandler, asyncHandler(createOfferCard));

// Update offer card with optional photo upload
router.put('/:id', isAuth, isAdmin, uploadSingleFile, multerErrorHandler, asyncHandler(updateOfferCard));

// Delete offer card
router.delete('/:id', isAuth, isAdmin, asyncHandler(deleteOfferCard));

// Toggle offer status (activate/deactivate)
router.patch('/:id/toggle', isAuth, isAdmin, asyncHandler(toggleOfferStatus));

export default router;
