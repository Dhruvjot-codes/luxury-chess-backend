import { OfferCard } from '../models/offercard.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Normalize date strings into proper Date objects cross-browser
const parseSafeDate = (dateStr) => {
  if (!dateStr) return null;
  // Handle DD-MM-YYYY or other common formats by attempting standard parsing
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // try replacing dashes with slashes which often helps older parsers
    d = new Date(dateStr.replace(/-/g, '/'));
  }
  return isNaN(d.getTime()) ? null : d;
};

// Create a new offer card (admin only)
export const createOfferCard = async (req, res) => {
  try {
    const { title, description, discountPercentage, specialDays, startDate, endDate, isActive } = req.body;

    if (!title || !description || discountPercentage == null || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Title, description, discountPercentage, startDate, and endDate are required' 
      });
    }

    // Attempt safe date parsing
    const start = parseSafeDate(startDate);
    const end = parseSafeDate(endDate);

    if (!start || !end) {
      return res.status(400).json({ 
        message: 'Invalid date format. Please use YYYY-MM-DD or MM/DD/YYYY' 
      });
    }

    if (end <= start) {
      return res.status(400).json({ 
        message: 'End date must be after start date' 
      });
    }

    // Validate discount percentage
    const discount = Number(discountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({ 
        message: 'Discount percentage must be a number between 0 and 100' 
      });
    }

    // Upload multiple photos to Cloudinary if available
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, 'offers'));
        const results = await Promise.all(uploadPromises);
        imagePaths = results.map(result => result.secure_url);
        console.log(`${imagePaths.length} offer images uploaded to Cloudinary`);
      } catch (cloudinaryErr) {
        console.error('Cloudinary upload failure:', cloudinaryErr);
        return res.status(500).json({ message: 'Failed to upload images. Please check Cloudinary config.' });
      }
    }

    const newOfferCard = new OfferCard({
      title,
      description,
      images: imagePaths,
      discountPercentage: discount,
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
      images: imagePaths,
    });
  } catch (error) {
    console.error('SERVER ERROR in createOfferCard:', error);
    res.status(error.status || 500).json({ 
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

    // Handle images
    let finalImages = [];
    
    // 1. Keep existing images (if passed as an array or JSON string)
    if (req.body.existingImages) {
      try {
        finalImages = typeof req.body.existingImages === 'string' 
          ? JSON.parse(req.body.existingImages) 
          : req.body.existingImages;
      } catch (e) {
        // if not JSON, assume it's a single string or already an array
        finalImages = Array.isArray(req.body.existingImages) 
          ? req.body.existingImages 
          : [req.body.existingImages];
      }
    } else if (!req.files || req.files.length === 0) {
      // If no new files and no existingImages specified, keep the old ones from DB
      const currentOffer = await OfferCard.findById(id);
      if (currentOffer) finalImages = currentOffer.images;
    }

    // 2. Upload and add new files
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, 'offers'));
        const results = await Promise.all(uploadPromises);
        const newImagePaths = results.map(result => result.secure_url);
        finalImages = [...finalImages, ...newImagePaths];
        console.log('Offer card images updated on Cloudinary');
      } catch (cloudinaryErr) {
        console.error('Cloudinary update failure:', cloudinaryErr);
        return res.status(500).json({ message: 'Failed to update images.' });
      }
    }

    updates.images = finalImages;

    const offerCard = await OfferCard.findByIdAndUpdate(id, updates, { new: true });
    if (!offerCard) {
      return res.status(404).json({ message: 'Offer card not found' });
    }
    
    res.status(200).json({ 
      message: 'Offer card updated successfully', 
      offerCard,
      images: offerCard.images,
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
