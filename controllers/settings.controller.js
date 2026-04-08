import { Settings } from '../models/settings.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';

export const updateSectionImages = async (req, res) => {
  const { section } = req.params; // 'explore' or 'about'
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No images uploaded' });
  }

  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file.path));
    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map(result => result.secure_url);

    // Clean up local temp files
    files.forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });

    const key = `${section}_section_images`;
    const settings = await Settings.findOneAndUpdate(
      { key },
      { value: imageUrls },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: `${section} images updated successfully`,
      data: settings
    });
  } catch (error) {
    console.error(`Error updating ${section} images:`, error);
    res.status(500).json({ message: 'Failed to upload images' });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.find();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

export const getSectionSettings = async (req, res) => {
    const { section } = req.params;
    try {
      const key = `${section}_section_images`;
      const settings = await Settings.findOne({ key });
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch section settings' });
    }
  };
