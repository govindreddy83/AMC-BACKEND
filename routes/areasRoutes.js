const express = require('express');
const router = express.Router();
const AreasController = require('../controllers/areasController');

// GET /api/areas
router.get('/', AreasController.getAreas);

module.exports = router;
