const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Service Account Authentication configuration using GOOGLE_APPLICATION_CREDENTIALS
 */
const getGoogleSheetsClient = () => {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credsJson = process.env.GOOGLE_CREDS_JSON;

  let auth;
  let fileExists = false;

  // 1. Try stringified JSON environment variable (Best for Render/Cloud deployment)
  if (credsJson) {
    try {
      const credentials = JSON.parse(credsJson);
      auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      fileExists = true;
    } catch (e) {
      console.error('⚠️ Error parsing GOOGLE_CREDS_JSON environment variable:', e.message);
    }
  }

  // 2. Fallback to standard keyfile path (Best for local development)
  if (!auth) {
    if (!credentialsPath) {
      throw new Error('Neither GOOGLE_APPLICATION_CREDENTIALS nor GOOGLE_CREDS_JSON is specified in .env');
    }

    const resolvedPath = path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.join(__dirname, '..', credentialsPath);

    fileExists = fs.existsSync(resolvedPath);

    if (!fileExists) {
      console.warn(
        `⚠️ Warning: Service account key file not found at "${resolvedPath}". Please save your JSON key file there.`
      );
    }

    auth = new google.auth.GoogleAuth({
      keyFile: resolvedPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  // Helper to extract ID if user paste full URL
  let parsedSheetId = sheetId;
  if (sheetId && sheetId.includes('docs.google.com/spreadsheets')) {
    const matches = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      parsedSheetId = matches[1];
    }
  }

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    sheetId: parsedSheetId,
    keyFileExists: fileExists,
  };
};

module.exports = {
  getGoogleSheetsClient,
};
