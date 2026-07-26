const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/apiRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Root Status Route
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to AMC Planner Google Sheets Integration Backend API',
    version: '1.0.0',
    adminPortal: 'http://localhost:5000/admin',
    authType: 'Service Account (GOOGLE_APPLICATION_CREDENTIALS)',
    sheetId: process.env.GOOGLE_SHEET_ID || 'Not set',
    endpoints: {
      health: '/api/health',
      admin: '/admin',
      readSheetsJson: '/api/sheets/read?range=Sheet1!A1:Z100',
      readSheetsRaw: '/api/sheets/raw?range=Sheet1!A1:Z100',
      appendSheetsData: '/api/sheets/append',
    },
  });
});

// Serve Admin Web Portal
const fs = require('fs');
const path = require('path');
const adminPath = fs.existsSync(path.join(__dirname, 'AMC Admin'))
  ? path.join(__dirname, 'AMC Admin')
  : path.join(__dirname, '../AMC Admin');
app.use('/admin', express.static(adminPath));

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 AMC Planner Backend listening on http://localhost:${PORT}`);
  console.log(`🔑 Service Account Keyfile Path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  console.log(`📊 Google Sheet ID: ${process.env.GOOGLE_SHEET_ID}`);
});
