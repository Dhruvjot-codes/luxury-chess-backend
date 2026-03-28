import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Order } from '../models/order.model.js';
import { Invoice } from '../models/invoice.model.js';
import { sendShippingUpdateEmail } from '../utils/emailService.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a Razorpay order for a given Order._id
export const createPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await Order.findById(orderId).populate('items.card').populate('user');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if order is in correct status for payment
    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Order cannot be paid. Current status: ${order.status}` });
    }

    const amountPaise = Math.round(order.totalAmount * 100); // Razorpay expects smallest currency unit

    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `order_rcpt_${order._id}`,
      payment_capture: 1,
    };

    const rOrder = await razorpay.orders.create(options);
    
    // persist razorpay order id on our order so webhook can find it
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
    console.error('Error createPaymentOrder:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify payment from frontend (after payment) and generate invoice
export const verifyPaymentAndGenerateInvoice = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // mark order as paid
    const order = await Order.findById(orderId).populate('user');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    order.status = 'processing';
    order.paymentInfo = { razorpay_order_id, razorpay_payment_id };
    
    // Add to order history
    order.orderHistory.push({
      status: 'paid',
      note: 'Payment received successfully'
    });
    order.orderHistory.push({
      status: 'processing',
      note: 'Order is being processed for shipping'
    });
    
    await order.save();

    // generate invoice PDF
    const invoice = await generateInvoiceForOrder(order);
    console.log('Invoice generated:', invoice.pdfPath);

    // Send payment confirmation email
    await sendShippingUpdateEmail(order, order.user, 'processing');

    return res.status(200).json({ 
      message: 'Payment processed and invoice generated', 
      invoiceUrl: invoice.pdfPath,
      invoiceId: invoice._id
    });
  } catch (err) {
    console.error('Error verifyPaymentAndGenerateInvoice:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// helper to generate invoice PDF and Invoice document for a paid order
const generateInvoiceForOrder = async (order) => {
  const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const invoice = new Invoice({ order: order._id, user: order.user, amount: order.totalAmount, pdfPath: '' });
  await invoice.save();

  const pdfFilename = `invoice-${invoice._id}.pdf`;
  const pdfPath = path.join(invoicesDir, pdfFilename);

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Header
  doc.fontSize(24).text('INVOICE', { align: 'center' }).moveDown();
  doc.fontSize(12).fillColor('#666').text(`Invoice ID: ${invoice._id}`, { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' }).moveDown();

  // Company Info
  doc.fontSize(14).fillColor('#333').text('The Luxury Chess Staunton', { align: 'left' });
  doc.fontSize(10).fillColor('#666').text('Premium Chess Equipment', { align: 'left' });
  doc.text('Email: contact@luxurychess.com', { align: 'left' }).moveDown();

  // Customer Info
  doc.fontSize(12).fillColor('#333').text('Bill To:', { align: 'left' });
  doc.fontSize(10).fillColor('#666').text(`${order.user?.username || 'Customer'}`, { align: 'left' });
  doc.text(`${order.user?.email || 'N/A'}`, { align: 'left' });
  if (order.shippingAddress) {
    doc.text(`${order.shippingAddress.street || ''}`, { align: 'left' });
    doc.text(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}`, { align: 'left' });
    doc.text(`${order.shippingAddress.postalCode || ''}, ${order.shippingAddress.country || ''}`, { align: 'left' });
  }
  doc.moveDown();

  // Order Details
  doc.fontSize(12).fillColor('#333').text('Order Details:', { align: 'left' });
  doc.fontSize(10).fillColor('#666').text(`Order ID: ${order._id}`, { align: 'left' });
  doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'left' });
  doc.text(`Payment Method: Razorpay`, { align: 'left' });
  doc.text(`Payment ID: ${order.paymentInfo?.razorpay_payment_id || 'N/A'}`, { align: 'left' }).moveDown();

  // Items Table Header
  doc.fontSize(12).fillColor('#333').text('Items:', { align: 'left' }).moveDown();
  
  let yPosition = doc.y;
  doc.fontSize(10);
  
  // Table headers
  doc.text('Description', 50, yPosition);
  doc.text('Quantity', 250, yPosition);
  doc.text('Price', 350, yPosition);
  doc.text('Total', 450, yPosition);
  
  yPosition += 20;
  doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
  yPosition += 10;

  // Items
  order.items.forEach((item, idx) => {
    const itemTotal = item.pricePerPiece * item.quantity;
    doc.text(item.card?.title || 'Product', 50, yPosition);
    doc.text(item.quantity.toString(), 250, yPosition);
    doc.text(`₹${item.pricePerPiece}`, 350, yPosition);
    doc.text(`₹${itemTotal}`, 450, yPosition);
    yPosition += 20;
  });

  // Total
  yPosition += 10;
  doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
  yPosition += 10;
  doc.fontSize(12).fillColor('#333').text(`Total Amount: ₹${order.totalAmount}`, 350, yPosition);

  // Footer
  doc.y = yPosition + 50;
  doc.fontSize(10).fillColor('#666').text('Thank you for your business!', { align: 'center' });
  doc.text('This is a computer-generated invoice.', { align: 'center' });

  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));

  invoice.pdfPath = `/uploads/invoices/${pdfFilename}`;
  await invoice.save();

  return invoice;
};

  // Razorpay webhook handler (server-to-server). Uses raw body for signature verification.
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const payload = req.body && req.body.toString ? req.body.toString() : JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    if (expected !== signature) {
      console.warn('Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const data = JSON.parse(payload);
    const event = data.event;

    // handle payment captured / authorized events
    if (event === 'payment.captured' || event === 'payment.authorized') {
      const paymentEntity = data.payload && (data.payload.payment && data.payload.payment.entity || data.payload.payment_entity);
      const razorpayOrderId = paymentEntity && paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity && paymentEntity.id;

      if (!razorpayOrderId) {
        return res.status(400).json({ message: 'No razorpay order id in webhook' });
      }

      const order = await Order.findOne({ 'paymentInfo.razorpay_order_id': razorpayOrderId }).populate('items.card').populate('user');
      if (!order) {
        console.warn('Order not found for razorpay_order_id', razorpayOrderId);
        return res.status(200).json({ message: 'Ignored: order not found' });
      }

      if (order.status === 'processing' || order.status === 'paid') {
        return res.status(200).json({ message: 'Order already processed' });
      }

      order.status = 'processing';
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.razorpay_order_id = razorpayOrderId;
      order.paymentInfo.razorpay_payment_id = razorpayPaymentId;
      
      // Add to order history
      order.orderHistory.push({
        status: 'paid',
        note: 'Payment received successfully'
      });
      order.orderHistory.push({
        status: 'processing',
        note: 'Order is being processed for shipping'
      });
      
      await order.save();

      const invoice = await generateInvoiceForOrder(order);
      console.log('Invoice generated via webhook:', invoice.pdfPath);

      // Send payment confirmation email
      await sendShippingUpdateEmail(order, order.user, 'processing');

      return res.status(200).json({ message: 'Payment processed and invoice generated', invoiceUrl: invoice.pdfPath });
    }

    // other events can be handled as needed
    return res.status(200).json({ message: 'Event received' });
  } catch (err) {
    console.error('Error in webhook handler:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
