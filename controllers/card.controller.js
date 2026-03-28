import { Card } from '../models/card.model.js';

// create a new card (admin only)
export const createCard = async (req, res) => {
  try {
    const { title, description, pricePerPiece, pieceCount, woodType } = req.body;

    if (!title || !description || pricePerPiece == null || pieceCount == null) {
      return res.status(400).json({ message: 'Title, description, pricePerPiece and pieceCount are required' });
    }

    // Get image path from uploaded file, or use provided image from body
    let imagePath = null;
    if (req.file) {
      // File was uploaded - store the path relative to public folder
      imagePath = `/uploads/${req.file.filename}`;
      console.log('File uploaded:', imagePath);
    }

    const newCard = new Card({
      title,
      description,
      image: imagePath, // store the file path
      pricePerPiece,
      pieceCount,
      woodType,
      createdBy: req.user?._id,
    });

    await newCard.save();
    res.status(201).json({ 
      message: 'Card created successfully', 
      card: newCard,
      imageUrl: imagePath,
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

    // If a new file was uploaded, update the image path
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
      console.log('Card image updated:', updates.image);
    }

    const card = await Card.findByIdAndUpdate(id, updates, { new: true });
    if (!card) return res.status(404).json({ message: 'Card not found' });
    
    res.status(200).json({ 
      message: 'Card updated successfully', 
      card,
      imageUrl: card.image,
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
