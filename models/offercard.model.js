import mongoose from 'mongoose';

const offerCardSchema = new mongoose.Schema({
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
    type: String, // Cloudinary URLs
    required: false,
  }],
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  specialDays: {
    type: [String], // Array of days: ['Monday', 'Tuesday', 'Wednesday', etc.]
    default: [],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Validation to ensure endDate is after startDate
offerCardSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

export const OfferCard = mongoose.model('OfferCard', offerCardSchema);
