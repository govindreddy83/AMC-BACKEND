const GoogleSheetsService = require('./googleSheetsService');
const { getMessaging } = require('../config/firebaseAdmin');

class FcmService {
  /**
   * Ensure FCM_Tokens tab exists in Google Sheets with proper headers
   */
  static async ensureFcmTokensTab() {
    await GoogleSheetsService.ensureTabExists('FCM_Tokens');
  }

  /**
   * Save or update FCM token in Google Sheets
   * @param {string} email User email or identifier
   * @param {string} token FCM device token
   */
  static async registerToken(email, token) {
    if (!token) {
      throw new Error('FCM token is required.');
    }

    const cleanEmail = (email || 'anonymous@amcplanner.com').trim().toLowerCase();
    const cleanToken = token.trim();
    const now = new Date().toISOString();

    await this.ensureFcmTokensTab();

    // Fetch existing tokens from FCM_Tokens tab
    let rows = [];
    try {
      rows = await GoogleSheetsService.readRawData('FCM_Tokens!A1:Z1000');
    } catch (_) {
      rows = [];
    }

    let tokenFoundIndex = -1;

    if (rows && rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const rowToken = rows[i][1] ? rows[i][1].trim() : '';
        if (rowToken === cleanToken) {
          tokenFoundIndex = i + 1; // 1-indexed row number in Sheet
          break;
        }
      }
    }

    if (tokenFoundIndex !== -1) {
      // Update existing token timestamp & email in Google Sheet
      await GoogleSheetsService.updateCell(`FCM_Tokens!A${tokenFoundIndex}:D${tokenFoundIndex}`, [
        [cleanEmail, cleanToken, rows[tokenFoundIndex - 1][2] || now, now],
      ]);
      console.log(`✅ FCM Token updated in Google Sheets for ${cleanEmail}`);
    } else {
      // Append new token record
      await GoogleSheetsService.appendData('FCM_Tokens!A1', [
        [cleanEmail, cleanToken, now, now],
      ]);
      console.log(`✅ FCM Token registered in Google Sheets for ${cleanEmail}`);
    }

    return { email: cleanEmail, token: cleanToken, registeredAt: now };
  }

  /**
   * Retrieve all registered FCM tokens from Google Sheets
   * @returns {Promise<Array<string>>} List of FCM tokens
   */
  static async getAllTokens() {
    await this.ensureFcmTokensTab();
    let rows = [];
    try {
      rows = await GoogleSheetsService.readRawData('FCM_Tokens!A1:Z2000');
    } catch (err) {
      console.warn('⚠️ Could not fetch FCM_Tokens from Google Sheets:', err.message);
      return [];
    }

    if (!rows || rows.length <= 1) {
      return [];
    }

    const tokensSet = new Set();
    for (let i = 1; i < rows.length; i++) {
      const token = rows[i][1] ? rows[i][1].trim() : '';
      if (token && token.length > 10) {
        tokensSet.add(token);
      }
    }

    return Array.from(tokensSet);
  }

  /**
   * Send notification to a specific token or all registered devices
   * @param {Object} notificationPayload
   * @param {string} notificationPayload.title Title of notification
   * @param {string} notificationPayload.body Body text
   * @param {Object} [notificationPayload.data] Custom data payload (area, code, poNo, etc.)
   * @param {string} [notificationPayload.targetToken] Specific token or null for all
   */
  static async sendNotification({ title, body, data = {}, targetToken = null }) {
    let tokens = [];
    if (targetToken) {
      tokens = [targetToken.trim()];
    } else {
      tokens = await this.getAllTokens();
    }

    if (tokens.length === 0) {
      console.log('ℹ️ No active FCM tokens found to send notification.');
      return { success: false, message: 'No registered FCM tokens found.' };
    }

    const messaging = getMessaging();

    // Prepare FCM Multicast / Single payload
    const messagePayload = {
      notification: {
        title: title || 'AMC Reminder',
        body: body || 'You have an AMC update.',
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        area: data.area || '',
        code: data.code || '',
        plannerNo: data.plannerNo || data.code || '',
        poNo: data.poNo || '',
        customerName: data.customerName || '',
        expiryDate: data.expiryDate || '',
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'amc_reminders_channel',
          sound: 'default',
          priority: 'max',
          visibility: 'public',
        },
      },
    };

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // Send using sendEachForMulticast
    try {
      const multicastMessage = {
        ...messagePayload,
        tokens,
      };

      const response = await messaging.sendEachForMulticast(multicastMessage);
      successCount = response.successCount;
      failureCount = response.failureCount;

      console.log(`🚀 FCM Notifications Sent! Success: ${successCount}, Failures: ${failureCount}`);

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          errors.push({ token: tokens[idx], error: resp.error ? resp.error.message : 'Unknown error' });
        }
      });
    } catch (error) {
      console.error('❌ FCM Multicast Error:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      successCount,
      failureCount,
      errors,
    };
  }
}

module.exports = FcmService;
