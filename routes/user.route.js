import express from 'express';
import {
  registerUser,
  registerUserWithOTP,
  sendOTPForRegistration,
  verifyOTPAndRegister,
  loginUser,
  getUsers,
  updateUserRole,
  deleteUser,
  getProfile,
  verifyAdmin,
  forgotPassword,
  resetPassword,
} from '../controllers/user.controller.js';
import { requestOTP, verifyOTPToken } from '../middlewares/otp.js';
import { asyncHandler } from '../middlewares/trycatch.js';
import { isAuth, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

// basic registration (no OTP)
router.post('/register', asyncHandler(registerUser));

// new endpoints for OTP workflow
// step 1 - generate OTP, email it and return activation token
router.post('/register/otp', asyncHandler(requestOTP), asyncHandler(sendOTPForRegistration));

// step 2 - verify otp & token then complete registration
router.post('/register/verify', asyncHandler(verifyOTPToken), asyncHandler(verifyOTPAndRegister));

router.post('/login', asyncHandler(loginUser));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password/:token', asyncHandler(resetPassword));

// admin-protected routes
// get all users (admin only)
router.get('/', isAuth, isAdmin, asyncHandler(getUsers));

// update user role (admin only)
router.put('/:id/role', isAuth, isAdmin, asyncHandler(updateUserRole));

// delete user (admin only)
router.delete('/:id', isAuth, isAdmin, asyncHandler(deleteUser));

// profile endpoint (requires valid JWT)
router.get('/profile', isAuth, asyncHandler(getProfile));

// verify admin status (requires valid JWT)
router.get('/verify-admin', isAuth, asyncHandler(verifyAdmin));

export default router;
