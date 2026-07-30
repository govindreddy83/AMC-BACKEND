const express = require('express');
const router = express.Router();
const FcmController = require('../controllers/fcmController');

// POST /api/register-token
router.post('/register-token', FcmController.registerToken);

// POST /api/update-token
router.post('/update-token', FcmController.updateToken);

// GET /api/send-test-notification
router.get('/send-test-notification', FcmController.sendTestNotification);

// GET /api/trigger-cron-check
router.get('/trigger-cron-check', FcmController.triggerCronCheck);

module.exports = router;
