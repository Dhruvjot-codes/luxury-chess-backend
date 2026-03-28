import { User } from '../models/user.model.js';
import { Card } from '../models/card.model.js';
import fs from 'fs';
import path from 'path';

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      message: 'Users retrieved',
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get single user by id (admin only)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User role updated', user });
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting self
    if (req.user._id.toString() === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Admin ${req.user.username} deleted user ${user.username}`);
    res.status(200).json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        username: user.username,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Promote user to admin (admin only)
export const promoteUserToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    let user;
    
    // Find by id or email
    if (id && id !== 'byemail') {
      user = await User.findById(id);
    } else if (email) {
      user = await User.findOne({ email });
    } else {
      return res.status(400).json({ message: 'User ID or email is required' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already admin
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    user.role = 'admin';
    await user.save();

    console.log(`Admin ${req.user.username} promoted ${user.username} to admin`);
    res.status(200).json({ 
      message: 'User promoted to admin successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error in promoteUserToAdmin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Demote admin to user (admin only)
export const demoteAdminToUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent demoting self
    if (req.user._id.toString() === id) {
      return res.status(400).json({ message: 'Cannot demote your own admin role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already a regular user
    if (user.role !== 'admin') {
      return res.status(400).json({ message: 'User is not an admin' });
    }

    user.role = 'user';
    await user.save();

    console.log(`Admin ${req.user.username} demoted ${user.username} from admin`);
    res.status(200).json({ 
      message: 'Admin demoted to user successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error in demoteAdminToUser:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all cards (admin view)
export const getAllCards = async (req, res) => {
  try {
    const cards = await Card.find()
      .populate('createdBy', '-password')
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Cards retrieved',
      count: cards.length,
      cards,
    });
  } catch (error) {
    console.error('Error in getAllCards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update card with image/video (admin only)
export const updateCardWithMedia = async (req, res) => {
  try {
    // Verify user is admin (double-check)
    if (!req.user || req.user.role !== 'admin') {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Parse numeric fields
    if (updates.pricePerPiece) updates.pricePerPiece = parseFloat(updates.pricePerPiece);
    if (updates.pieceCount) updates.pieceCount = parseInt(updates.pieceCount);

    // attach file path if file was uploaded
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    const card = await Card.findByIdAndUpdate(id, updates, { new: true });
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    console.log(`Card updated by admin ${req.user._id}: ${card._id}`);
    res.status(200).json({ message: 'Card updated with media', card });
  } catch (error) {
    console.error('Error in updateCardWithMedia:', error);
    // clean up uploaded file if something went wrong
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create card with image/video (admin only)
export const createCardWithMedia = async (req, res) => {
  try {
    // Verify user is admin (double-check)
    if (!req.user || req.user.role !== 'admin') {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { title, description, pricePerPiece, pieceCount, woodType } = req.body;

    if (!title || !description || pricePerPiece == null || pieceCount == null) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(400).json({ message: 'Title, description, pricePerPiece and pieceCount are required' });
    }

    const cardData = {
      title,
      description,
      pricePerPiece: parseFloat(pricePerPiece),
      pieceCount: parseInt(pieceCount),
      woodType,
      createdBy: req.user._id,
    };

    if (req.file) {
      cardData.image = `/uploads/${req.file.filename}`;
    }

    const newCard = new Card(cardData);
    await newCard.save();

    console.log(`Card created by admin ${req.user._id}: ${newCard._id}`);
    res.status(201).json({ message: 'Card created with media', card: newCard });
  } catch (error) {
    console.error('Error in createCardWithMedia:', error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get dashboard statistics (admin only)
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCards = await Card.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = await User.countDocuments({ role: 'user' });

    res.status(200).json({
      message: 'Dashboard statistics',
      stats: {
        totalUsers,
        totalCards,
        adminCount,
        userCount,
      },
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Upload file (images/videos) - admin only
export const uploadFile = async (req, res) => {
  try {
    // Verify user is admin (double-check)
    if (!req.user || req.user.role !== 'admin') {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`File uploaded by admin ${req.user._id}: ${req.file.filename}`);
    
    res.status(200).json({
      message: 'File uploaded successfully',
      fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error in uploadFile:', error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete card and its media (admin only)
export const deleteCardWithMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // delete associated file if exists
    if (card.image) {
      const filePath = path.join(process.cwd(), 'server', card.image);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting file:', err);
        }
      });
    }

    await Card.findByIdAndDelete(id);
    res.status(200).json({ message: 'Card and associated media deleted' });
  } catch (error) {
    console.error('Error in deleteCardWithMedia:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
