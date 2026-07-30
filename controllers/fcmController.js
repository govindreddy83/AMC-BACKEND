const FcmService = require('../services/fcmService');
const CronService = require('../services/cronService');

class FcmController {
  /**
   * Register or update FCM Device Token
   * POST /api/register-token
   */
  static async registerToken(req, res, next) {
    try {
      const { email, token } = req.body;
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'FCM token is required.',
        });
      }

      const result = await FcmService.registerToken(email, token);
      return res.status(200).json({
        success: true,
        message: 'FCM device token registered successfully in Google Sheets.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update existing FCM Token
   * POST /api/update-token
   */
  static async updateToken(req, res, next) {
    try {
      const { email, token } = req.body;
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'New FCM token is required.',
        });
      }

      const result = await FcmService.registerToken(email, token);
      return res.status(200).json({
        success: true,
        message: 'FCM device token updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Test FCM Notification
   * GET /api/send-test-notification
   */
  static async sendTestNotification(req, res, next) {
    try {
      const { token, title, body, area, code, poNo } = req.query;

      const payload = {
        title: title || 'AMC Reminder Test',
        body: body || 'AMC will expire in 90 days.\n\nArea\nP7 Block\n\nEquipment ID\nP7/OPC/274\n\nCurrent PO\n4515002620\n\nPlease renew before expiry.',
        data: {
          area: area || 'P7 Block',
          code: code || 'P7/OPC/274',
          plannerNo: code || 'P7/OPC/274',
          poNo: poNo || '4515002620',
          customerName: 'Test Vendor',
          expiryDate: new Date().toISOString().split('T')[0],
        },
        targetToken: token || null,
      };

      const result = await FcmService.sendNotification(payload);
      return res.status(200).json({
        success: true,
        message: 'Test FCM Notification dispatch attempted.',
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger Cron Job AMC Expiry check for immediate testing
   * GET /api/trigger-cron-check
   */
  static async triggerCronCheck(req, res, next) {
    try {
      const result = await CronService.checkAndSendAmcReminders();
      return res.status(200).json({
        success: true,
        message: 'AMC Expiry Cron Check completed.',
        result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FcmController;
