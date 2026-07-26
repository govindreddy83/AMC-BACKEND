const express = require('express');
const multer = require('multer');
const router = express.Router();
const UploadController = require('../controllers/uploadController');

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed!'), false);
    }
  },
});

router.get('/pdf-mappings', UploadController.getMappings);
router.get('/test-cloudinary', UploadController.testCloudinary);
router.post('/upload-pdf', upload.single('pdf'), UploadController.uploadPdf);
router.post('/delete-pdf', UploadController.deleteMapping);

module.exports = router;
