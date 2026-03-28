import express from 'express';
import {
  createCard,
  listCards,
  getCard,
  updateCard,
  deleteCard,
} from '../controllers/card.controller.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/trycatch.js';
import { uploadSingleFile, multerErrorHandler } from '../middlewares/multer.js';

const router = express.Router();

// public endpoints
router.get('/', asyncHandler(listCards));
router.get('/:id', asyncHandler(getCard));

// admin-protected endpoints (requires auth and admin role)
// POST with file upload
router.post('/', isAuth, isAdmin, uploadSingleFile, multerErrorHandler, asyncHandler(createCard));
// PUT with optional file upload
router.put('/:id', isAuth, isAdmin, uploadSingleFile, multerErrorHandler, asyncHandler(updateCard));
router.delete('/:id', isAuth, isAdmin, asyncHandler(deleteCard));

export default router;
