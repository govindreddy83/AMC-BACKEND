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
}

module.exports = GoogleSheetsService;
