const express = require('express');
const router = express.Router();
const PlannerDetailController = require('../controllers/plannerDetailController');

// Handles both GET /api/planner?plannerNo=P1/WEB/002 and GET /api/planner/P1/WEB/002
router.get('/', PlannerDetailController.getPlannerDetails);
router.use('/', PlannerDetailController.getPlannerDetails);

module.exports = router;
