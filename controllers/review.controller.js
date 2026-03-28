import { Review } from '../models/review.model.js';
import { Card } from '../models/card.model.js';

// Create a review (user must be authenticated)
export const createReview = async (req, res) => {
  try {
    const { card: cardId, rating, text } = req.body;

    if (!cardId || !rating) {
      return res.status(400).json({ message: 'Card and rating are required' });
    }

    // require review text when user submits rating
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Review text is required when rating' });
    }

    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    // collect uploaded photos if any
    const photos = (req.files || []).map(f => `/uploads/${f.filename}`);

    const review = new Review({
      card: cardId,
      user: req.user._id,
      rating: Number(rating),
      text,
      photos,
      status: 'pending',
    });

    await review.save();

    // return minimal info; admin must approve to become visible
    res.status(201).json({ message: 'Review submitted for admin approval', review: { id: review._id, status: review.status } });
  } catch (error) {
    console.error('Error in createReview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Public: list approved reviews for a card
export const listApprovedReviewsForCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const reviews = await Review.find({ card: cardId, status: 'approved' })
      .populate('user', '-password')
      .sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error in listApprovedReviewsForCard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: list pending reviews
export const listPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'pending' })
      .populate('user', '-password')
      .populate('card')
      .sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error in listPendingReviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: approve review
export const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.status = 'approved';
    await review.save();
    res.status(200).json({ message: 'Review approved', review });
  } catch (error) {
    console.error('Error in approveReview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: reject review
export const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.status = 'rejected';
    await review.save();
    res.status(200).json({ message: 'Review rejected', review });
  } catch (error) {
    console.error('Error in rejectReview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: delete review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Error in deleteReview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
