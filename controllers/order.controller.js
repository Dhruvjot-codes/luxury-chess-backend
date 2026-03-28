import { OrderRequest } from '../models/orderRequest.model.js';
import { Order } from '../models/order.model.js';
import { Card } from '../models/card.model.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { sendOrderConfirmationEmail, sendShippingUpdateEmail, sendAdminNotificationEmail } from '../utils/emailService.js';

// User: create order request (click 'Get Order' on a card)
export const createOrderRequest = async (req, res) => {
  try {
    const { cardId, quantity = 1, notes } = req.body;
    if (!cardId) return res.status(400).json({ message: 'cardId is required' });

    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const orderReq = await OrderRequest.create({
      card: cardId,
      user: req.user._id,
      quantity,
      notes,
      status: 'pending',
    });

    // notify admin via console/log (you can add email later)
    console.log('New order request created:', orderReq._id);
    res.status(201).json({ message: 'Order request submitted', orderRequest: orderReq });
  } catch (err) {
    console.error('Error createOrderRequest:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: list pending order requests
export const listPendingOrderRequests = async (req, res) => {
  try {
    const requests = await OrderRequest.find({ status: 'pending' }).populate('user', '-password').populate('card');
    res.status(200).json(requests);
  } catch (err) {
    console.error('Error listPendingOrderRequests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: accept order request and convert to order (cart -> proceed to payment)
export const acceptOrderRequest = async (req, res) => {
  try {
    const { id } = req.params; // order request id
    const orderReq = await OrderRequest.findById(id).populate('card').populate('user');
    if (!orderReq) return res.status(404).json({ message: 'Order request not found' });

    if (orderReq.status !== 'pending') return res.status(400).json({ message: 'Order request already processed' });

    // create order with price derived from card
    const itemPrice = orderReq.card.pricePerPiece;
    const totalAmount = itemPrice * orderReq.quantity;

    const order = await Order.create({
      user: orderReq.user,
      items: [{ card: orderReq.card._id, quantity: orderReq.quantity, pricePerPiece: itemPrice }],
      totalAmount,
      status: 'pending',
      orderHistory: [{ status: 'pending', note: 'Order created and awaiting payment' }]
    });

    // mark request as accepted
    orderReq.status = 'accepted';
    await orderReq.save();

    // Send order confirmation email
    await sendOrderConfirmationEmail(order, orderReq.user);

    // return created order so frontend can proceed to payment
    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    console.error('Error acceptOrderRequest:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User: get own orders
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.card');
    res.status(200).json(orders);
  } catch (err) {
    console.error('Error getUserOrders:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User: get own pending requests
export const getUserOrderRequests = async (req, res) => {
  try {
    const requests = await OrderRequest.find({ user: req.user._id }).populate('card').sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (err) {
    console.error('Error getUserOrderRequests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: delete order request (reject)
export const rejectOrderRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const reqDoc = await OrderRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Order request not found' });
    reqDoc.status = 'rejected';
    await reqDoc.save();
    res.status(200).json({ message: 'Order request rejected' });
  } catch (err) {
    console.error('Error rejectOrderRequest:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Razorpay: create payment order for full payment
export const createRazorpayPayment = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findById(id).populate('items.card').populate('user');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if order belongs to user or user is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order is in correct status for payment
    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Order cannot be paid. Current status: ${order.status}` });
    }

    const amountPaise = Math.round(order.totalAmount * 100); // Razorpay expects smallest currency unit

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `order_rcpt_${order._id}`,
      payment_capture: 1,
    };

    const rOrder = await razorpay.orders.create(options);
    
    // persist razorpay order id on our order
    order.paymentInfo = order.paymentInfo || {};
    order.paymentInfo.razorpay_order_id = rOrder.id;
    await order.save();

    res.status(201).json({ 
      message: 'Razorpay order created', 
      razorpayOrder: rOrder, 
      orderId: order._id, 
      key: process.env.RAZORPAY_KEY_ID 
    });
  } catch (err) {
    console.error('Error createRazorpayPayment:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Razorpay: verify payment signature
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment legitimate. Update order status
      const order = await Order.findById(id).populate('user');
      
      // Update order status and add to history
      order.status = 'processing';
      order.paymentInfo = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        type: 'full_payment'
      };
      order.orderHistory.push({
        status: 'paid',
        note: 'Payment received successfully'
      });
      order.orderHistory.push({
        status: 'processing',
        note: 'Order is being processed for shipping'
      });
      await order.save();

      // Send payment confirmation email
      await sendShippingUpdateEmail(order, order.user, 'processing');

      // Send admin notification
      await sendAdminNotificationEmail('Payment Received', `New payment received for order ${order._id}`, order);

      res.status(200).json({ 
        success: true, 
        message: "Payment verified! Your order is now being processed for shipment." 
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment signature verification" });
    }
  } catch (err) {
    console.error('Error verifying razorpay payment:', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

// Admin: update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, note } = req.body;

    const order = await Order.findById(id).populate('user');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const previousStatus = order.status;
    order.status = status;
    
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    // Add to order history
    order.orderHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated from ${previousStatus} to ${status}`
    });

    await order.save();

    // Send email notification to user
    await sendShippingUpdateEmail(order, order.user, status, trackingNumber);

    // Send admin notification
    await sendAdminNotificationEmail('Order Status Updated', `Order ${order._id} status updated to ${status}`, order);

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// Get order details with tracking
export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('items.card').populate('user', 'username email');
    
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error('Error getting order details:', err);
    res.status(500).json({ message: 'Failed to get order details' });
  }
};
