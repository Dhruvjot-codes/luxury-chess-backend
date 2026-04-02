import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: [{
    type: String,
    required: true,
  }],
  pricePerPiece: {
    type: Number,
    required: true,
    min: 0,
  },
  pieceCount: {
    type: Number,
    required: true,
    min: 1,
  },
  woodType: {
    type: String,
    required: false,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  material: {
    type: String,
    required: false,
  },
  dimensions: {
    type: String,
    required: false,
  },
  inTheBox: {
    type: String, // "you are getting"
    required: false,
  },
  weight: {
    type: String,
    required: false,
  },
  suitableFor: {
    type: String, // "suitable for chess piece"
    required: false,
  },
  note: {
    type: String,
    required: false,
  },
  disclaimer: {
    type: String,
    required: false,
  },
  shippingInfo: {
    type: String,
    required: false,
  },
  deliveryPrice: {
    type: String,
    required: false,
  },
  warrantyInfo: {
    type: String,
    required: false,
  },
  securePaymentInfo: {
    type: String,
    required: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// virtual field for total price
cardSchema.virtual('totalPrice').get(function() {
  return this.pricePerPiece * this.pieceCount;
});

export const Card = mongoose.model('Card', cardSchema);
