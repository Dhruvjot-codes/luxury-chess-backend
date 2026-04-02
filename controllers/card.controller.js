import { Card } from '../models/card.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// create a new card (admin only)
export const createCard = async (req, res) => {
  try {
    const { 
      title, description, pricePerPiece, pieceCount, woodType,
      discountPercentage, material, dimensions, inTheBox, weight,
      suitableFor, note, disclaimer, shippingInfo, deliveryPrice,
      warrantyInfo, securePaymentInfo
    } = req.body;

    if (!title || !description || pricePerPiece == null || pieceCount == null) {
      return res.status(400).json({ message: 'Title, description, pricePerPiece and pieceCount are required' });
    }

    // Handle multiple image uploads to Cloudinary
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
      const results = await Promise.all(uploadPromises);
      imagePaths = results.map(result => result.secure_url);
      console.log(`${imagePaths.length} images uploaded to Cloudinary`);
    }

    const newCard = new Card({
      title,
      description,
      images: imagePaths, // store array of URLs
      pricePerPiece,
      pieceCount,
      woodType,
      discountPercentage: discountPercentage || 0,
      material,
      dimensions,
      inTheBox,
      weight,
      suitableFor,
      note,
      disclaimer,
      shippingInfo,
      deliveryPrice,
      warrantyInfo,
      securePaymentInfo,
      createdBy: req.user?._id,
    });

    await newCard.save();
    res.status(201).json({ 
      message: 'Card created successfully', 
      card: newCard,
      images: imagePaths,
    });
  } catch (error) {
    console.error('Error in createCard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// list all cards (public)
export const listCards = async (req, res) => {
  try {
    const cards = await Card.find().sort({ createdAt: -1 });
    res.status(200).json(cards);
  } catch (error) {
    console.error('Error in listCards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// get single card by id
export const getCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.status(200).json(card);
  } catch (error) {
    console.error('Error in getCard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// update card (admin only)
export const updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
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
      const currentCard = await Card.findById(id);
      if (currentCard) finalImages = currentCard.images;
    }

    // 2. Upload and add new files
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
      const results = await Promise.all(uploadPromises);
      const newImagePaths = results.map(result => result.secure_url);
      finalImages = [...finalImages, ...newImagePaths];
      console.log(`${newImagePaths.length} new images uploaded to Cloudinary`);
    }

    updates.images = finalImages;

    const card = await Card.findByIdAndUpdate(id, updates, { new: true });
    if (!card) return res.status(404).json({ message: 'Card not found' });
    
    res.status(200).json({ 
      message: 'Card updated successfully', 
      card,
      images: card.images,
    });
  } catch (error) {
    console.error('Error in updateCard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// delete card (admin only)
export const deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findByIdAndDelete(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.status(200).json({ message: 'Card deleted' });
  } catch (error) {
    console.error('Error in deleteCard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
