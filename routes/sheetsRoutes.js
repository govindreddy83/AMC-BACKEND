const express = require('express');
const router = express.Router();
const SheetsController = require('../controllers/sheetsController');

// Read data formatted as JSON objects array
router.get('/read', SheetsController.readSheetsAsJson);

// Read raw 2D array of rows
router.get('/raw', SheetsController.readRawSheets);

// Append new rows to sheet
router.post('/append', SheetsController.appendSheetData);

module.exports = router;
