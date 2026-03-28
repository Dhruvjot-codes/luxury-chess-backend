import { User } from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendOTPEmail, sendVerificationEmail, sendResetPasswordEmail } from '../middlewares/sendMail.js';

// NB: OTP constants and helper logic have been moved into dedicated middleware (middlewares/otp.js).
// The helpers are still exported there if controllers need them, but core registration flow now uses middleware.

// JWT secret is still needed in controller when creating user or verifying tokens
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // hash token and set to userSchema
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

        await user.save();

        // send reset email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
        const mailResult = await sendResetPasswordEmail(user.email, resetUrl, user.username);

        if (!mailResult.success) {
            return res.status(500).json({ message: 'Error sending reset email', error: mailResult.error });
        }

        res.status(200).json({ message: 'Reset password link sent to your email' });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // set new password
        user.password = await bcryptjs.hash(req.body.password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};


export const registerUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        // determine role: default to 'user', but allow admin to assign other roles
        let assignedRole = 'user';
        if (role && req.user && req.user.role === 'admin') {
            assignedRole = role;
        }

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: assignedRole,
        });

        await newUser.save();

        // debug – log the full user document and response that will be sent
        console.log('registerUser created user:', newUser);
        const responsePayload = { id: newUser._id, username: newUser.username, email: newUser.email, role: newUser.role };
        console.log('registerUser response payload:', responsePayload);

        res.status(201).json({ message: "User created successfully", user: responsePayload });
    } catch (error) {
        console.error("Error in registerUser:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Legacy controller helper - returns OTP data prepared by requestOTP middleware
export const registerUserWithOTP = async (req, res) => {
  try {
    if (req.otpData) {
      const { activationToken, otpExpiresAt } = req.otpData;
      return res.status(200).json({
        message: 'OTP sent to your email. Please verify to complete registration.',
        activationToken,
        otpExpiresAt,
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  } catch (err) {
    console.error('Error in registerUserWithOTP:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper controller - returns OTP response data prepared by requestOTP middleware
export const sendOTPForRegistration = (req, res) => {
  try {
    const { activationToken, otpExpiresAt } = req.otpData || {};
    if (!activationToken) {
      return res.status(500).json({ message: 'Unable to generate OTP' });
    }
    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      activationToken,
      otpExpiresAt,
    });
  } catch (err) {
    console.error('Error in sendOTPForRegistration:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify OTP and complete registration
// This controller assumes the `verifyOTPToken` middleware has already checked the
// token and OTP and stored the decoded payload at `req.activationPayload`.
export const verifyOTPAndRegister = async (req, res) => {
    try {
        const decoded = req.activationPayload;
        if (!decoded) {
            return res.status(400).json({ message: 'Activation data missing' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: decoded.email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // always ensure a role is present; schema default may not have been applied on
        // older documents so we set it explicitly here. OTP flow doesn't allow choosing
        // a role, so we default to 'user'.
        const newUser = new User({
            username: decoded.username,
            email: decoded.email,
            password: decoded.hashedPassword,
            role: decoded.role || 'user',
        });

        await newUser.save();

        // send welcome/verification email
        await sendVerificationEmail(decoded.email, decoded.username, newUser._id);

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });

        res.status(201).json({
            message: 'User registered and verified successfully',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role, // include role in response
            },
        });
    } catch (error) {
        console.error('Error in verifyOTPAndRegister:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });

        res.status(200).json({
          message: "Login successful",
          token,
          user: { id: user._id, username: user.username, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error("Error in loginUser:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// get all users (admin only)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// update user role (admin only)
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!role || !['user', 'admin'].includes(role.toLowerCase())) {
            return res.status(400).json({ message: "Invalid role specified" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.role = role.toLowerCase();
        await user.save();

        res.status(200).json({ message: "User role updated successfully", user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// delete user (admin only)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// return profile of authenticated user
export const getProfile = async (req, res) => {
    try {
        // isAuth middleware should have attached req.user
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        res.status(200).json({
            message: 'Profile retrieved successfully',
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role || 'user',
            },
        });
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// verify if current user is admin
export const verifyAdmin = async (req, res) => {
    try {
        // isAuth middleware attaches req.user
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const isAdmin = req.user.role && req.user.role.toLowerCase() === 'admin';
        res.status(200).json({
            message: 'Admin status retrieved',
            isAdmin,
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role || 'user',
            },
        });
    } catch (error) {
        console.error('Error in verifyAdmin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
