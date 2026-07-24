const express = require('express');
const router = express.Router();
const sheetsRoutes = require('./sheetsRoutes');
const areasRoutes = require('./areasRoutes');
const plannersRoutes = require('./plannersRoutes');
const plannerDetailRoutes = require('./plannerDetailRoutes');
const diagnosticController = require('../controllers/diagnosticController');

// API Healthcheck route
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'online',
    service: 'AMC Planner Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Diagnostic route
router.get('/diagnostic', diagnosticController.runDiagnostic);

// Mount Routes
router.use('/sheets', sheetsRoutes);
router.use('/areas', areasRoutes);
router.use('/planners', plannersRoutes);
router.use('/planner', plannerDetailRoutes);

module.exports = router;
