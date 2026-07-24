const express = require('express');
const router = express.Router();
const PlannersController = require('../controllers/plannersController');

// GET /api/planners?area=P1
router.get('/', PlannersController.getPlanners);

module.exports = router;
