import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOrderConfirmationEmail = async (order, user) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Order Confirmation - Luxury Chess Staunton',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Order Confirmation</h2>
          <p>Dear ${user.username},</p>
          <p>Thank you for your order! Your order has been received and is now being processed.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Items</h3>
            ${order.items.map((item, index) => `
              <div style="margin-bottom: 10px;">
                <p><strong>${index + 1}. ${item.card?.title || 'Product'}</strong></p>
                <p>Quantity: ${item.quantity} | Price: ₹${item.pricePerPiece} each</p>
              </div>
            `).join('')}
          </div>
          
          <p>You will receive another email once your payment is confirmed and your order is shipped.</p>
          <p>Thank you for choosing Luxury Chess Staunton!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', user.email);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
};

export const sendShippingUpdateEmail = async (order, user, status, trackingNumber = null) => {
  try {
    const statusMessages = {
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped!',
      delivered: 'Your order has been delivered!',
    };

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: `Order Update: ${status.charAt(0).toUpperCase() + status.slice(1)} - Luxury Chess Staunton`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">Order Update</h2>
          <p>Dear ${user.username},</p>
          <p>${statusMessages[status] || `Your order status has been updated to: ${status}`}</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
            ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
            <p><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          ${status === 'shipped' ? `
            <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h4>Shipping Information</h4>
              <p>Your order is on its way! You can track your package using the tracking number above.</p>
              <p>Expected delivery: 3-5 business days</p>
            </div>
          ` : ''}
          
          ${status === 'delivered' ? `
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h4>Delivery Confirmed</h4>
              <p>Your order has been successfully delivered. We hope you enjoy your purchase!</p>
              <p>Please leave a review on our website to share your experience.</p>
            </div>
          ` : ''}
          
          <p>Thank you for choosing Luxury Chess Staunton!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Shipping update email (${status}) sent to:`, user.email);
  } catch (error) {
    console.error('Error sending shipping update email:', error);
  }
};

export const sendAdminNotificationEmail = async (subject, message, order = null) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: process.env.EMAIL, // Send to admin email
      subject: `Admin Notification: ${subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #d9534f;">Admin Notification</h2>
          <p>${message}</p>
          
          ${order ? `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Customer:</strong> ${order.user?.username} (${order.user?.email})</p>
              <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          ` : ''}
          
          <p>Please check the admin dashboard for more details.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated message from the system.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Admin notification email sent for:', subject);
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }
};
