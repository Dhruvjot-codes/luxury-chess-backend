import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  promoteUserToAdmin,
  demoteAdminToUser,
  getAllCards,
  updateCardWithMedia,
  createCardWithMedia,
  getDashboardStats,
  uploadFile,
  deleteCardWithMedia,
} from '../controllers/admin.controller.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/trycatch.js';
import { uploadSingleFile, multerErrorHandler } from '../middlewares/multer.js';

const router = express.Router();

// All admin routes are protected by isAuth + isAdmin
router.use(isAuth, isAdmin);

// Dashboard & Statistics
router.get('/stats', asyncHandler(getDashboardStats));

// User Management
router.get('/users', asyncHandler(getAllUsers));
router.get('/users/:id', asyncHandler(getUserById));
router.put('/users/:id/role', asyncHandler(updateUserRole));
router.patch('/users/:id/promote', asyncHandler(promoteUserToAdmin)); // Promote to admin
router.patch('/users/:id/demote', asyncHandler(demoteAdminToUser)); // Demote from admin
router.delete('/users/:id', asyncHandler(deleteUser));

// Card Management
router.get('/cards', asyncHandler(getAllCards));
router.post('/cards', uploadSingleFile, multerErrorHandler, asyncHandler(createCardWithMedia));
router.put('/cards/:id', uploadSingleFile, multerErrorHandler, asyncHandler(updateCardWithMedia));
router.delete('/cards/:id', asyncHandler(deleteCardWithMedia));

// File Upload
router.post('/upload', uploadSingleFile, multerErrorHandler, asyncHandler(uploadFile));

export default router;
