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

  const isJsonString = (str) => {
    if (!str) return false;
    const trimmed = str.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}');
  };

  // 1. Try parsing JSON content directly (if pasted into GOOGLE_CREDS_JSON or GOOGLE_APPLICATION_CREDENTIALS)
  let rawJson = null;
  if (isJsonString(credsJson)) {
    rawJson = credsJson;
  } else if (isJsonString(credentialsPath)) {
    rawJson = credentialsPath;
  }

  if (rawJson) {
    try {
      const credentials = JSON.parse(rawJson);
      auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      fileExists = true;
    } catch (e) {
      console.error('⚠️ Error parsing credentials JSON string:', e.message);
    }
  }

  // 2. Fallback to standard keyfile path (Best for local development)
  if (!auth) {
    if (!credentialsPath) {
      throw new Error('Neither GOOGLE_APPLICATION_CREDENTIALS nor GOOGLE_CREDS_JSON is specified');
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
