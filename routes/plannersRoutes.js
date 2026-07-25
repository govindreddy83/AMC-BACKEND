const express = require('express');
const router = express.Router();
const PlannersController = require('../controllers/plannersController');

// GET /api/planners/all
router.get('/all', PlannersController.getAllPlanners);

// GET /api/planners?area=P1
router.get('/', PlannersController.getPlanners);

module.exports = router;
