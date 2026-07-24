const { getGoogleSheetsClient } = require('../config/googleSheetsConfig');

class DiagnosticController {
  static async runDiagnostic(req, res) {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'configured' : 'missing',
        GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? 'configured' : 'missing',
        GOOGLE_CREDS_JSON: process.env.GOOGLE_CREDS_JSON ? 'configured' : 'missing',
      },
      checks: {},
    };

    try {
      const config = getGoogleSheetsClient();
      diagnostic.checks.configLoad = 'success';
      diagnostic.checks.sheetId = config.sheetId;
      diagnostic.checks.keyFileExists = config.keyFileExists;

      // Try connection
      const client = config.sheets;
      const response = await client.spreadsheets.values.get({
        spreadsheetId: config.sheetId,
        range: 'Sheet1!A1:B2', // simple query
      });

      diagnostic.connection = 'success';
      diagnostic.dataLoaded = response.data.values ? `${response.data.values.length} rows` : '0 rows';
    } catch (error) {
      diagnostic.connection = 'failed';
      diagnostic.error = {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.errors || error.response?.data || null,
      };
    }

    return res.status(200).json(diagnostic);
  }
}

module.exports = DiagnosticController;
