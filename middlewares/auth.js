import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// Middleware to protect routes by verifying JWT in Authorization header.
// Attaches `req.user` with user record if valid.
export const isAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // fetch user from database (exclude password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error in isAuth middleware:', error);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// simple role guard - ensures user is admin
export const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      console.warn('Admin access attempt without authentication');
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!req.user.role) {
      console.warn(`Admin access attempt by user ${req.user._id} with no role`);
      return res.status(403).json({ message: 'Forbidden: user role not set' });
    }
    if (req.user.role.toLowerCase() !== 'admin') {
      console.warn(`Admin access attempt by user ${req.user._id} with role: ${req.user.role}`);
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }
    console.log(`Admin access granted to user ${req.user._id} (${req.user.username})`);
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};