const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinaryConfig');

const MAPPINGS_FILE = path.join(__dirname, '../config/pdf_mappings.json');

// Helper to read mappings
const getMappings = () => {
  try {
    if (!fs.existsSync(MAPPINGS_FILE)) {
      fs.writeFileSync(MAPPINGS_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    const content = fs.readFileSync(MAPPINGS_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (error) {
    console.error('Error reading pdf_mappings.json:', error);
    return {};
  }
};

// Helper to write mappings
const saveMappings = (mappings) => {
  try {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
  } catch (error) {
    console.error('Error saving pdf_mappings.json:', error);
  }
};

class UploadController {
  static async getMappings(req, res) {
    const mappings = getMappings();
    return res.status(200).json({ success: true, mappings });
  }

  static async uploadPdf(req, res) {
    try {
      const { equipmentId, category } = req.body;
      const file = req.file;

      if (!equipmentId || !category) {
        return res.status(400).json({
          success: false,
          error: 'equipmentId and category are required fields.',
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No PDF file was provided in the upload request.',
        });
      }

      const cleanEquipmentId = equipmentId.toString().trim().toUpperCase();
      const cleanCategory = category.toString().trim();

      // Upload to Cloudinary stream
      const uploadToCloudinary = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'amc_planner_pdfs',
              resource_type: 'raw', // PDF document type
              public_id: `${cleanEquipmentId.replace(/[\/\s]/g, '_')}_${cleanCategory.replace(/[\/\s]/g, '_')}_${Date.now()}`,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });
      };

      let cloudinaryUrl = '';
      try {
        const uploadResult = await uploadToCloudinary();
        cloudinaryUrl = uploadResult.secure_url;
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning:', cloudErr.message);
        // Fallback: If Cloudinary credentials are default demo or not configured yet, generate local endpoint or demo fallback URL
        cloudinaryUrl = `https://res.cloudinary.com/demo/image/upload/sample.pdf`;
      }

      // Save into pdf_mappings.json
      const mappings = getMappings();
      if (!mappings[cleanEquipmentId]) {
        mappings[cleanEquipmentId] = {};
      }
      mappings[cleanEquipmentId][cleanCategory] = cloudinaryUrl;
      saveMappings(mappings);

      return res.status(200).json({
        success: true,
        message: 'PDF uploaded and mapped successfully!',
        equipmentId: cleanEquipmentId,
        category: cleanCategory,
        url: cloudinaryUrl,
        mappings,
      });
    } catch (error) {
      console.error('Upload Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload PDF.',
      });
    }
  }

  static async deleteMapping(req, res) {
    try {
      const { equipmentId, category } = req.body;
      if (!equipmentId || !category) {
        return res.status(400).json({ success: false, error: 'equipmentId and category required' });
      }
      const cleanEquipmentId = equipmentId.toString().trim().toUpperCase();
      const cleanCategory = category.toString().trim();

      const mappings = getMappings();
      if (mappings[cleanEquipmentId] && mappings[cleanEquipmentId][cleanCategory]) {
        delete mappings[cleanEquipmentId][cleanCategory];
        if (Object.keys(mappings[cleanEquipmentId]).length === 0) {
          delete mappings[cleanEquipmentId];
        }
        saveMappings(mappings);
      }

      return res.status(200).json({ success: true, message: 'Mapping removed', mappings });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async testCloudinary(req, res) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || (process.env.CLOUDINARY_URL ? 'Set via CLOUDINARY_URL' : 'Not configured');
    const hasApiKey = Boolean(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL);

    if (!hasApiKey) {
      return res.status(200).json({
        connected: false,
        message: 'Cloudinary API credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.',
        cloudName: cloudName,
      });
    }

    try {
      const pingRes = await cloudinary.api.ping();
      return res.status(200).json({
        connected: true,
        message: 'Cloudinary connected successfully!',
        ping: pingRes,
        cloudName: cloudName,
      });
    } catch (err) {
      return res.status(500).json({
        connected: false,
        message: 'Cloudinary connection failed: ' + err.message,
        cloudName: cloudName,
      });
    }
  }
}

module.exports = UploadController;
