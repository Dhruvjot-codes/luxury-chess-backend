import nodemailer from 'nodemailer';

// Before creating the transporter make sure we've got credentials available.
// Gmail requires either an app password (if 2FA is enabled) or that "less secure"
// access is allowed. See https://support.google.com/mail/?p=BadCredentials
// for details. Set the following environment variables, for example in a
// .env file loaded by dotenv in index.js or wherever you start the app:
//
//   EMAIL=<your@gmail.com>            # primary name used for auth
//   EMAIL_PASS=<app-password-or-pass> # app password or normal password
//   EMAIL_HOST=smtp.gmail.com         # optional, defaults to gmail
//   EMAIL_PORT=587                    # optional, defaults to 587
//   EMAIL_SECURE=false                # use STARTTLS
//
// Older variable names are still supported (MAIL_USER / MAIL_PASS).
// The transporter is verified at startup so problems surface earlier instead
// of failing later when sending the first message.

const mailUser = process.env.EMAIL || process.env.MAIL_USER;
const mailPass = process.env.EMAIL_PASS || process.env.MAIL_PASS;

if (!mailUser || !mailPass) {
  console.error('Mailer configuration error: missing EMAIL / MAIL_USER or PASSWORD');
}

// Use the Gmail service shorthand to avoid manual host/port/secure settings.
// Nodemailer knows the correct configuration for a number of well-known
// providers when you specify `service` instead of `host`.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: mailUser,
    pass: mailPass,
  },
});

// verify connection configuration at startup
transporter.verify().then(() => {
  console.log('Mail transporter successfully verified');
}).catch(err => {
  console.error('Mail transporter verification failed', err);
});

// Send OTP verification email
export const sendOTPEmail = async (email, otp, username = 'User') => {
  try {
    const mailOptions = {
      from: `"The Luxury Chess Staunton" <${mailUser}>`,
      to: email,
      subject: 'Email Verification - OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">Email Verification</h2>
            <p style="color: #555; font-size: 16px;">Hello ${username},</p>
            <p style="color: #555; font-size: 16px;">Thank you for registering with us. To complete your registration, please verify your email address using the OTP below:</p>
            
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <p style="font-size: 12px; color: #999; margin: 0;">Your OTP Code:</p>
              <h1 style="color: #007bff; font-size: 48px; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
            </div>
            
            <p style="color: #555; font-size: 16px;">This OTP will expire in 10 minutes.</p>
            <p style="color: #555; font-size: 16px;">If you did not request this verification, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply to this email.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center;">
              © 2026 Luxuey Chess. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent:', info.response);
    return {
      success: true,
      message: 'OTP sent successfully to your email',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return {
      success: false,
      message: 'Failed to send OTP email',
      error: error.message,
    };
  }
};

// Middleware to send OTP email during registration
export const sendOTPMailMiddleware = async (req, res, next) => {
  try {
    const { email, otp, username } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Send OTP email
    const result = await sendOTPEmail(email, otp, username || 'User');

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to send OTP email',
        error: result.error,
      });
    }

    // Attach mail result to request object for next middleware
    req.mailResult = result;
    next();
  } catch (error) {
    console.error('Error in sendOTPMailMiddleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Send verification email after successful registration
export const sendVerificationEmail = async (email, username, userId) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify?id=${userId}`;

    const mailOptions = {
      from: `"The Luxury Chess Staunton" <${mailUser}>`,
      to: email,
      subject: 'Account Verified - Welcome to Luxuey Chess',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">Welcome to Luxuey Chess!</h2>
            <p style="color: #555; font-size: 16px;">Hello ${username},</p>
            <p style="color: #555; font-size: 16px;">Congratulations! Your email has been verified and your account is now active.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Continue to Dashboard
              </a>
            </div>
            
            <p style="color: #555; font-size: 16px;">You can now log in and start using all features of Luxuey Chess.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              If you didn't create this account, please contact our support team.
            </p>
            <p style="color: #999; font-size: 12px; text-align: center;">
              © 2026 Luxuey Chess. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.response);
    return {
      success: true,
      message: 'Welcome email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return {
      success: false,
      message: 'Failed to send welcome email',
      error: error.message,
    };
  }
};

// Send password reset email
export const sendResetPasswordEmail = async (email, resetUrl, username = 'User') => {
  try {
    const mailOptions = {
      from: `"The Luxury Chess Staunton" <${mailUser}>`,
      to: email,
      subject: 'Reset Password - Luxuey Chess',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
            <p style="color: #555; font-size: 16px;">Hello ${username},</p>
            <p style="color: #555; font-size: 16px;">You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #555; font-size: 14px;"><strong>Note:</strong> This link is valid for only 15 minutes.</p>
            <p style="color: #555; font-size: 14px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Reset Password email sent:', info.response);
    return {
      success: true,
      message: 'Reset email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending reset password email:', error);
    return {
      success: false,
      message: 'Failed to send reset email',
      error: error.message,
    };
  }
};
