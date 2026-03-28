import { OfferCard } from '../models/offercard.model.js';

// Create a new offer card (admin only)
export const createOfferCard = async (req, res) => {
  try {
    const { title, description, discountPercentage, specialDays, startDate, endDate, isActive } = req.body;

    if (!title || !description || discountPercentage == null || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Title, description, discountPercentage, startDate, and endDate are required' 
      });
    }

    // Validate discount percentage
    if (discountPercentage < 0 || discountPercentage > 100) {
      return res.status(400).json({ 
        message: 'Discount percentage must be between 0 and 100' 
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ 
        message: 'End date must be after start date' 
      });
    }

    // Get photo path from uploaded file if available
    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/${req.file.filename}`;
      console.log('Offer card photo uploaded:', photoPath);
    }

    const newOfferCard = new OfferCard({
      title,
      description,
      photo: photoPath,
      discountPercentage,
      specialDays: specialDays || [],
      startDate: start,
      endDate: end,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?._id,
    });

    await newOfferCard.save();
    res.status(201).json({ 
      message: 'Offer card created successfully', 
      offerCard: newOfferCard,
      photoUrl: photoPath,
    });
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Get all offer cards (public)
export const listOfferCards = async (req, res) => {
  try {
    const offerCards = await OfferCard.find().sort({ createdAt: -1 });
    res.status(200).json(offerCards);
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Get single offer card by id
export const getOfferCard = async (req, res) => {
  try {
    const { id } = req.params;
    const offerCard = await OfferCard.findById(id);
    if (!offerCard) {
      return res.status(404).json({ message: 'Offer card not found' });
    }
    res.status(200).json(offerCard);
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Get active offer cards only (public)
export const getActiveOffers = async (req, res) => {
  try {
    const now = new Date();
    const activeOffers = await OfferCard.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 });
    
    res.status(200).json(activeOffers);
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Update offer card (admin only)
export const updateOfferCard = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Validate discount percentage if provided
    if (updates.discountPercentage != null) {
      if (updates.discountPercentage < 0 || updates.discountPercentage > 100) {
        return res.status(400).json({ 
          message: 'Discount percentage must be between 0 and 100' 
        });
      }
    }

    // Validate dates if provided
    if (updates.startDate || updates.endDate) {
      const start = updates.startDate ? new Date(updates.startDate) : null;
      const end = updates.endDate ? new Date(updates.endDate) : null;
      
      if (start && end && end <= start) {
        return res.status(400).json({ 
          message: 'End date must be after start date' 
        });
      }
    }

    // If a new file was uploaded, update the photo path
    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
      console.log('Offer card photo updated:', updates.photo);
    }

    const offerCard = await OfferCard.findByIdAndUpdate(id, updates, { new: true });
    if (!offerCard) {
      return res.status(404).json({ message: 'Offer card not found' });
    }
    
    res.status(200).json({ 
      message: 'Offer card updated successfully', 
      offerCard,
      photoUrl: offerCard.photo,
    });
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Delete offer card (admin only)
export const deleteOfferCard = async (req, res) => {
  try {
    const { id } = req.params;
    const offerCard = await OfferCard.findByIdAndDelete(id);
    if (!offerCard) {
      return res.status(404).json({ message: 'Offer card not found' });
    }
    res.status(200).json({ message: 'Offer card deleted successfully' });
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Toggle offer card active status (admin only)
export const toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const offerCard = await OfferCard.findById(id);
    if (!offerCard) {
      return res.status(404).json({ message: 'Offer card not found' });
    }

    offerCard.isActive = !offerCard.isActive;
    await offerCard.save();

    res.status(200).json({ 
      message: `Offer card ${offerCard.isActive ? 'activated' : 'deactivated'} successfully`, 
      offerCard,
    });
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};
