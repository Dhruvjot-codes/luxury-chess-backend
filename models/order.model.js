import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
      quantity: { type: Number, required: true, min: 1 },
      pricePerPiece: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  paymentInfo: { type: Object },
  trackingNumber: { type: String },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  orderHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
