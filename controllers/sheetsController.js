const GoogleSheetsService = require('../services/googleSheetsService');

/**
 * Controller handling Google Sheets endpoints.
 */
class SheetsController {
  /**
   * GET /api/sheets/read?range=Sheet1!A1:Z100
   * Reads Google Sheet data and returns structured JSON array
   */
  static async readSheetsAsJson(req, res, next) {
    try {
      const range = req.query.range || 'Sheet1!A1:Z100';
      const jsonData = await GoogleSheetsService.readJsonData(range);

      return res.status(200).json({
        success: true,
        message: 'Google Sheet data retrieved as JSON',
        range: range,
        count: jsonData.length,
        data: jsonData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sheets/raw?range=Sheet1!A1:Z100
   * Reads Google Sheet raw 2D array of rows
   */
  static async readRawSheets(req, res, next) {
    try {
      const range = req.query.range || 'Sheet1!A1:Z100';
      const rawRows = await GoogleSheetsService.readRawData(range);

      return res.status(200).json({
        success: true,
        message: 'Google Sheet raw data retrieved',
        range: range,
        rowsCount: rawRows.length,
        data: rawRows,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sheets/append
   * Body: { range: "Sheet1!A:E", values: [["row1_val1", "row1_val2"]] }
   */
  static async appendSheetData(req, res, next) {
    try {
      const { range = 'Sheet1!A:Z', values } = req.body;

      if (!values || !Array.isArray(values)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. "values" must be a 2D array.',
        });
      }

      const result = await GoogleSheetsService.appendData(range, values);

      return res.status(201).json({
        success: true,
        message: 'Data appended successfully to Google Sheet',
        result: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SheetsController;
