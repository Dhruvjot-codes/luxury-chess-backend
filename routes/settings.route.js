import express from 'express';
import { updateSectionImages, getSettings, getSectionSettings } from '../controllers/settings.controller.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/trycatch.js';
import { uploadMultipleFiles, multerErrorHandler } from '../middlewares/multer.js';

const router = express.Router();

router.get('/', asyncHandler(getSettings));
router.get('/:section', asyncHandler(getSectionSettings));
router.post('/:section', isAuth, isAdmin, uploadMultipleFiles, multerErrorHandler, asyncHandler(updateSectionImages));

export default router;
