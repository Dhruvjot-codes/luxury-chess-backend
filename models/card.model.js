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
  image: {
    type: String, // url or base64 path
    required: false,
  },
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
