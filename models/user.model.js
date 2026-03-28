import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role:{
    type: String,
    default: 'user',
  },
  subcriptions:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  ],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
