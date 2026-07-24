const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('===================================================');
console.log('📊 Google Sheets Connection Diagnostic Tool');
console.log('===================================================\n');

// 1. Verify Environment Variables
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const sheetId = process.env.GOOGLE_SHEET_ID;

console.log('🔍 Checking environment variables (.env)...');
if (!credPath) {
  console.log('❌ Error: GOOGLE_APPLICATION_CREDENTIALS is not set in backend/.env');
  process.exit(1);
}
console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS: "${credPath}"`);

if (!sheetId || sheetId === 'your_google_sheet_id_here') {
  console.log('❌ Error: GOOGLE_SHEET_ID is not configured in backend/.env or is still using the placeholder value.');
  process.exit(1);
}

// Auto-extract ID if user pasted a full URL
let parsedSheetId = sheetId;
if (sheetId.includes('docs.google.com/spreadsheets')) {
  const matches = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    parsedSheetId = matches[1];
    console.log(`ℹ️ Info: Extracted Google Sheet ID from URL: "${parsedSheetId}"`);
  } else {
    console.log('❌ Error: The value of GOOGLE_SHEET_ID is a generic Google Sheets URL.');
    console.log('💡 Solution: You must open your specific spreadsheet in Google Sheets and copy its exact URL.');
    console.log('   Example of correct URL: https://docs.google.com/spreadsheets/d/1V9WT7K_fXdoGo8wcs8EwmJE_noWbafwdf7TpsRRy154/edit');
    process.exit(1);
  }
} else {
  console.log(`✅ GOOGLE_SHEET_ID: "${sheetId}"`);
}

// 2. Verify Keyfile Existence
const resolvedPath = path.isAbsolute(credPath)
  ? credPath
  : path.join(__dirname, credPath);

console.log(`\n🔍 Checking service account file at: "${resolvedPath}"...`);
if (!fs.existsSync(resolvedPath)) {
  console.log('❌ Error: Service account JSON keyfile not found.');
  console.log(`💡 Solution: Please download your service account JSON file from Google Cloud Console and save it to: "${resolvedPath}"`);
  process.exit(1);
}
console.log('✅ Service account file exists!');

// 3. Verify Keyfile JSON validity
let credentials;
try {
  const content = fs.readFileSync(resolvedPath, 'utf8');
  credentials = JSON.parse(content);
  console.log('✅ Service account file contains valid JSON!');
} catch (err) {
  console.log('❌ Error: Failed to parse service account JSON file.');
  console.log(`💡 Details: ${err.message}`);
  process.exit(1);
}

// 4. Print Service Account info
const clientEmail = credentials.client_email;
if (!clientEmail) {
  console.log('❌ Error: "client_email" field is missing in your service account JSON file.');
  process.exit(1);
}
console.log(`\n🔑 Service Account Email: "${clientEmail}"`);
console.log('👉 IMPORTANT: You MUST share your Google Sheet with this email address so the app can read it!');

// 5. Test Live Sheets API Call
console.log('\n🌐 Testing connection to Google Sheets API...');

const auth = new google.auth.GoogleAuth({
  keyFile: resolvedPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function testConnection() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: parsedSheetId,
      range: 'Sheet1!A1:Z5', // Read the top rows to see if headers exist
    });

    console.log('🎉 CONNECTION SUCCESSFUL!');
    console.log('✅ Successfully connected and fetched rows from Google Sheet.');
    
    const rows = res.data.values;
    if (rows && rows.length > 0) {
      console.log(`📊 Found ${rows.length} rows of data. Headers found: ${JSON.stringify(rows[0])}`);
    } else {
      console.log('⚠️ Connected successfully, but the sheet "Sheet1" is currently empty.');
    }
  } catch (error) {
    console.log('\n❌ API Error: Connection failed.');
    const errMsg = error.message || '';
    const status = error.status || (error.response && error.response.status);
    
    console.log(`Error Details: Status Code: ${status || 'Unknown'} | Message: ${errMsg}`);
    
    console.log('\n💡 Diagnostic Advice:');
    if (errMsg.includes('Requested entity was not found') || status === 404) {
      console.log('   - The GOOGLE_SHEET_ID in your .env might be incorrect.');
      console.log('     Please verify the ID from the URL of your Google Sheet: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit');
    } else if (errMsg.includes('The caller does not have permission') || status === 403) {
      console.log(`   - The Service Account does not have permission to read this sheet.`);
      console.log(`     Solution: Open your Google Sheet, click the blue "Share" button, add "${clientEmail}" as a "Viewer" or "Editor", and click save.`);
    } else if (errMsg.includes('API has not been used') || errMsg.includes('disabled')) {
      console.log('   - Google Sheets API is not enabled in your Google Cloud Project.');
      console.log('     Solution: Open Google Cloud Console, select your project, go to APIs & Services -> Library, search for "Google Sheets API", and click "Enable".');
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
      console.log('   - Network/DNS issue. Please check your internet connection.');
    } else {
      console.log('   - Double check your credentials file permissions, the sheet range name (make sure "Sheet1" tab exists), and make sure the sheet is public or shared.');
    }
  }
}

testConnection();
