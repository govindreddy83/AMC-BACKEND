const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Configure Google Auth JWT Client for Google Sheets API authentication
 */
const getGoogleSheetsClient = () => {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Format private key properly handling newline characters
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!serviceAccountEmail || !privateKey) {
    console.warn(
      '⚠️ Warning: Google Service Account credentials missing in .env file. Google Sheets API calls will fail until configured.'
    );
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

module.exports = {
  getGoogleSheetsClient,
  sheetId: process.env.GOOGLE_SHEET_ID,
};
