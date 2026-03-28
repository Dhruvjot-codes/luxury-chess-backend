import mongoose from 'mongoose';

const orderRequestSchema = new mongoose.Schema({
  card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  notes: { type: String },
}, { timestamps: true });

export const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);
