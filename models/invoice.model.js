import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  pdfPath: { type: String, required: true },
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
