const { getGoogleSheetsClient, sheetId } = require('../config/sheetsConfig');

/**
 * Service providing high-level helper functions for Google Sheets API operations.
 */
class SheetsService {
  /**
   * Fetch data rows from specified range in Google Sheet
   * @param {string} range e.g., "Sheet1!A1:Z100"
   */
  static async readSheetData(range = 'Sheet1!A1:Z100') {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });
    return response.data.values || [];
  }

  /**
   * Append row data to Google Sheet
   * @param {string} range e.g., "Sheet1!A:E"
   * @param {Array<Array<any>>} values e.g., [["ID", "Title", "Date", "Status"]]
   */
  static async appendSheetData(range, values) {
    const sheets = getGoogleSheetsClient();
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
   * Update existing row data in Google Sheet
   * @param {string} range e.g., "Sheet1!A2:D2"
   * @param {Array<Array<any>>} values
   */
  static async updateSheetData(range, values) {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.update({
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

module.exports = SheetsService;
