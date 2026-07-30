const cron = require('node-cron');
const GoogleSheetsService = require('./googleSheetsService');
const FcmService = require('./fcmService');

class CronService {
  /**
   * Helper to parse date string into JavaScript Date object
   * Supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, and Excel serial dates
   */
  static parseDate(dateStr) {
    if (!dateStr) return null;
    const str = dateStr.toString().trim();
    if (!str) return null;

    // Check Excel serial number date
    if (/^\d{5}$/.test(str)) {
      const serial = parseInt(str, 10);
      const utcDays = serial - 25569;
      const utcValue = utcDays * 86400;
      return new Date(utcValue * 1000);
    }

    // Standard ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return new Date(str);
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      return new Date(year, month, day);
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Ensure Notification_History tab exists in Google Sheets to track sent reminders
   */
  static async ensureNotificationHistoryTab() {
    try {
      const rows = await GoogleSheetsService.readRawData('Notification_History!A1:Z5');
      if (!rows || rows.length === 0) {
        await GoogleSheetsService.appendData('Notification_History!A1', [
          ['EquipmentID', 'Area', 'PONumber', 'ExpiryDate', 'ReminderType', 'SentAt'],
        ]);
        console.log('✅ Created "Notification_History" tab in Google Sheets.');
      }
    } catch (_) {
      try {
        await GoogleSheetsService.appendData('Notification_History!A1', [
          ['EquipmentID', 'Area', 'PONumber', 'ExpiryDate', 'ReminderType', 'SentAt'],
        ]);
        console.log('✅ Auto-created "Notification_History" tab in Google Sheets.');
      } catch (err) {
        console.warn('⚠️ Notice auto-creating Notification_History sheet:', err.message);
      }
    }
  }

  /**
   * Main workflow to check AMC end dates, calculate remaining days, and send FCM reminders
   */
  static async checkAndSendAmcReminders() {
    console.log('⏰ Running AMC Reminder Cron Job check...');
    await this.ensureNotificationHistoryTab();

    let rawRows = [];
    try {
      rawRows = await GoogleSheetsService.readRawData('Planner!A1:AZ500');
    } catch (_) {
      try {
        rawRows = await GoogleSheetsService.readRawData('Sheet1!A1:AZ500');
      } catch (err) {
        console.error('❌ Cron Job Error reading Google Sheets:', err.message);
        return { success: false, error: err.message };
      }
    }

    if (!rawRows || rawRows.length <= 1) {
      console.log('ℹ️ No planner records found in Google Sheets.');
      return { success: true, count: 0, message: 'No records found' };
    }

    // Helper header search
    const cleanHeader = (h) => (h ? h.toString().toLowerCase().replace(/[\r\n\s]+/g, ' ').trim() : '');
    const headers = rawRows[0].map(cleanHeader);

    const findHeaderIndex = (possibleNames) => {
      const targets = possibleNames.map(cleanHeader);
      return headers.findIndex((h) => targets.includes(h));
    };

    const plannerNoIdx = findHeaderIndex(['plannerno', 'planner_no', 'code', 'planner no', 'equipment id', 'equipment_id']);
    const areaIdx = findHeaderIndex(['area', 'block details', 'block_details']);
    const poNoIdx = findHeaderIndex(['ponumber', 'po_number', 'po_no', 'po no', 'current po', 'current_po (2025-2026)']);
    const customerIdx = findHeaderIndex(['customername', 'customer_name', 'customer', 'customer name', 'vendor']);
    const endDateIdx = findHeaderIndex(['enddate', 'end_date', 'end date', 'to', 'amc end date']);

    if (plannerNoIdx === -1 || endDateIdx === -1) {
      console.warn('⚠️ Could not locate PlannerNo or EndDate columns in Google Sheets.');
      return { success: false, error: 'Required columns (Equipment ID / End Date) not found in Google Sheets.' };
    }

    // Fetch existing notification history to prevent duplicate notifications
    let historyRows = [];
    try {
      historyRows = await GoogleSheetsService.readRawData('Notification_History!A1:Z5000');
    } catch (_) {
      historyRows = [];
    }

    const sentMap = new Set();
    if (historyRows && historyRows.length > 1) {
      for (let i = 1; i < historyRows.length; i++) {
        const eqId = historyRows[i][0] ? historyRows[i][0].toString().trim().toUpperCase() : '';
        const remType = historyRows[i][4] ? historyRows[i][4].toString().trim() : '';
        if (eqId && remType) {
          sentMap.add(`${eqId}_${remType}`);
        }
      }
    }

    let startIdx = 1;
    if (rawRows.length > 1) {
      const row1Val = rawRows[1][plannerNoIdx] ? rawRows[1][plannerNoIdx].toString().toLowerCase().trim() : '';
      if (['plannerno', 'planner_no', 'code', 'planner no', 'equipment id'].includes(row1Val)) {
        startIdx = 2;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetMilestones = [90, 60, 30, 15, 7, 1];
    let remindersSentCount = 0;
    const appendHistoryRows = [];

    for (let i = startIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      const code = row[plannerNoIdx] ? row[plannerNoIdx].toString().trim() : '';
      const area = areaIdx !== -1 && row[areaIdx] ? row[areaIdx].toString().trim() : 'N/A';
      const poNo = poNoIdx !== -1 && row[poNoIdx] ? row[poNoIdx].toString().trim() : 'N/A';
      const customerName = customerIdx !== -1 && row[customerIdx] ? row[customerIdx].toString().trim() : '';
      const rawEndDate = row[endDateIdx] ? row[endDateIdx].toString().trim() : '';

      if (!code || !rawEndDate) continue;

      const endDateObj = this.parseDate(rawEndDate);
      if (!endDateObj) continue;

      endDateObj.setHours(0, 0, 0, 0);

      // Calculate remaining days
      const diffTime = endDateObj.getTime() - today.getTime();
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if remainingDays matches one of the target milestones
      if (targetMilestones.includes(remainingDays)) {
        const milestoneKey = `${code.toUpperCase()}_${remainingDays}`;

        // Duplicate prevention: skip if notification was already sent for this milestone
        if (sentMap.has(milestoneKey)) {
          console.log(`⏩ Skipping duplicate reminder for ${code} (${remainingDays} days milestone already sent).`);
          continue;
        }

        const title = 'AMC Reminder';
        const body = `AMC will expire in ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}.\n\nArea\n${area}\n\nEquipment ID\n${code}\n\nCurrent PO\n${poNo}\n\nPlease renew before expiry.`;
        const dataPayload = {
          area,
          code,
          plannerNo: code,
          poNo,
          customerName,
          expiryDate: rawEndDate,
          remainingDays: remainingDays.toString(),
        };

        console.log(`🔔 Sending ${remainingDays}-Day AMC Expiry Reminder for ${code}...`);
        const result = await FcmService.sendNotification({
          title,
          body,
          data: dataPayload,
        });

        if (result.success) {
          remindersSentCount++;
          sentMap.add(milestoneKey);
          appendHistoryRows.push([
            code,
            area,
            poNo,
            rawEndDate,
            remainingDays.toString(),
            new Date().toISOString(),
          ]);
        }
      }
    }

    // Persist new history records to Google Sheets
    if (appendHistoryRows.length > 0) {
      try {
        await GoogleSheetsService.appendData('Notification_History!A1', appendHistoryRows);
        console.log(`✅ Saved ${appendHistoryRows.length} reminder log(s) to Google Sheets Notification_History.`);
      } catch (err) {
        console.warn('⚠️ Could not write Notification_History logs to Google Sheets:', err.message);
      }
    }

    console.log(`🎉 AMC Reminder Cron Job completed. Total notifications sent: ${remindersSentCount}`);
    return {
      success: true,
      remindersSentCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Initialize daily scheduled cron job at 9:00 AM
   */
  static initCronJob() {
    // Schedule cron job every day at 9:00 AM ('0 9 * * *')
    cron.schedule('0 9 * * *', async () => {
      console.log('⏰ [CRON SCHEDULE] Executing daily 9:00 AM AMC Expiry check...');
      try {
        await CronService.checkAndSendAmcReminders();
      } catch (err) {
        console.error('❌ Daily Cron Execution Error:', err.message);
      }
    });

    console.log('📅 AMC Expiry Notification Cron Job scheduled (Daily at 9:00 AM).');
  }
}

module.exports = CronService;
