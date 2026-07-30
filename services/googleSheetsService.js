const { getGoogleSheetsClient } = require('../config/googleSheetsConfig');

/**
 * Reusable Google Sheets Service for reading and writing sheet data.
 */
class GoogleSheetsService {
  /**
   * Reads raw 2D array of rows from Google Sheet
   * @param {string} range e.g., "Sheet1!A1:Z100"
   * @returns {Promise<Array<Array<string>>>} 2D array of sheet rows
   */
  static async readRawData(range = 'Sheet1!A1:Z100') {
    const { sheets, sheetId, keyFileExists } = getGoogleSheetsClient();

    if (!keyFileExists) {
      console.warn('⚠️ Keyfile missing. Returning empty array or mock payload.');
      return [];
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    return response.data.values || [];
  }

  /**
   * Reads sheet data and transforms rows into structured JSON objects using the first row as key headers
   * @param {string} range e.g., "Sheet1!A1:Z100"
   * @returns {Promise<Array<Object>>} Array of JSON objects
   */
  static async readJsonData(range = 'Sheet1!A1:Z100') {
    const rows = await this.readRawData(range);

    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0].map((header) =>
      header.trim().toLowerCase().replace(/\s+/g, '_')
    );

    const jsonObjects = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : '';
      });
      return obj;
    });

    return jsonObjects;
  }

  /**
   * Appends new rows to Google Sheet
   * @param {string} range e.g., "Sheet1!A:E"
   * @param {Array<Array<any>>} values 2D array of values to append
   */
  static async appendData(range = 'Sheet1!A:Z', values = []) {
    const { sheets, sheetId } = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values,
      },
    });

    return response.data;
  }

  /**
   * Overwrites data in a Google Sheet range
   * @param {string} range e.g., "PDF_Mappings!A:D"
   * @param {Array<Array<any>>} values 2D array of values to write
   */
  static async updateData(range, values = []) {
    const { sheets, sheetId } = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    return response.data;
  }

  /**
   * Clears data in a Google Sheet range
   * @param {string} range e.g., "PDF_Mappings!A2:D500"
   */
  static async clearData(range) {
    const { sheets, sheetId } = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data;
  }

  /**
   * Automatically checks if a sheet tab exists, and if not, creates it programmatically.
   * @param {string} tabName name of the tab to check/create (e.g. "PDF_Mappings")
   */
  static async ensureTabExists(tabName) {
    const { sheets, sheetId, keyFileExists } = getGoogleSheetsClient();
    if (!keyFileExists) return;

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      const sheetsList = response.data.sheets || [];
      const exists = sheetsList.some((s) => s.properties.title === tabName);

      if (!exists) {
        console.log(`Creating missing sheet tab: ${tabName}`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tabName,
                  },
                },
              },
            ],
          },
        });

        // Add headers for specific auto-created tabs
        if (tabName === 'PDF_Mappings') {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'PDF_Mappings!A1:D1',
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [['Equipment ID', 'Category', 'PDF URL', 'Timestamp']],
            },
          });
        } else if (tabName === 'FCM_Tokens') {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'FCM_Tokens!A1:D1',
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [['Email', 'Token', 'RegisteredAt', 'LastUpdated']],
            },
          });
        } else if (tabName === 'Notification_History') {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Notification_History!A1:F1',
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [['EquipmentID', 'Area', 'PONumber', 'ExpiryDate', 'ReminderType', 'SentAt']],
            },
          });
        }
      }
    } catch (err) {
      console.warn(`Error ensuring sheet tab "${tabName}" exists:`, err.message);
    }
  }
}

module.exports = GoogleSheetsService;
