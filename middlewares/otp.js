import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { sendOTPEmail } from './sendMail.js';

// configuration constants - reuse across middleware and controller
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const ACTIVATION_TOKEN_EXPIRY = '24h';
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// generate a numeric OTP string (default 6 digits)
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// signs a token containing any payload (for activation use case)
export const signActivationToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACTIVATION_TOKEN_EXPIRY });
};

// middleware that validates registration input, creates otp and activation token, sends email
export const requestOTP = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // OTP generation / expiration
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // hash the password now so we can include it in the activation token
    const hashedPassword = await bcryptjs.hash(password, 10);

    // create activation token with registration data and otp
    const activationPayload = {
      username,
      email,
      hashedPassword,
      otp,
    };
    const activationToken = signActivationToken(activationPayload);

    // send email with OTP
    const mailResult = await sendOTPEmail(email, otp, username);
    if (!mailResult.success) {
      console.error('requestOTP middleware failed to send OTP:', mailResult.error);
      // return error details to client for easier troubleshooting (remove in prod)
      return res.status(500).json({ message: 'Failed to send OTP email', error: mailResult.error });
    }

    // attach data to request for the route handler or next middleware
    req.otpData = { otpExpiresAt, activationToken };
    next();
  } catch (error) {
    console.error('Error in requestOTP middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// middleware to verify OTP against activation token payload
export const verifyOTPToken = (req, res, next) => {
  try {
    const { activationToken, otp } = req.body;
    if (!activationToken || !otp) {
      return res.status(400).json({ message: 'Activation token and OTP are required' });
    }

    const decoded = jwt.verify(activationToken, JWT_SECRET);
    if (decoded.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // attach decoded payload so controller can create the user
    req.activationPayload = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid or expired activation token' });
    }
    console.error('Error in verifyOTPToken middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};