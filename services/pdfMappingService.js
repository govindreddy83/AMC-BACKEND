const fs = require('fs');
const path = require('path');
const GoogleSheetsService = require('./googleSheetsService');

const MAPPINGS_FILE = path.join(__dirname, '../config/pdf_mappings.json');

class PdfMappingService {
  static getLocalMappings() {
    try {
      if (fs.existsSync(MAPPINGS_FILE)) {
        const content = fs.readFileSync(MAPPINGS_FILE, 'utf8');
        return JSON.parse(content || '{}');
      }
    } catch (e) {
      console.error('Error reading local pdf_mappings.json:', e.message);
    }
    return {};
  }

  static saveLocalMappings(mappings) {
    try {
      fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
    } catch (e) {
      console.error('Error saving local pdf_mappings.json:', e.message);
    }
  }

  static async fetchAllMappings() {
    let mappings = this.getLocalMappings();

    try {
      const rows = await GoogleSheetsService.readRawData('PDF_Mappings!A1:C500');
      if (rows && rows.length > 0) {
        rows.forEach((row) => {
          if (row.length >= 3) {
            const eqId = (row[0] || '').toString().trim().toUpperCase();
            const category = (row[1] || '').toString().trim();
            const url = (row[2] || '').toString().trim();
            if (eqId && category && url) {
              if (!mappings[eqId]) mappings[eqId] = {};
              mappings[eqId][category] = url;
            }
          }
        });
        this.saveLocalMappings(mappings);
      }
    } catch (sheetsErr) {
      // PDF_Mappings tab might not exist yet, fallback gracefully
    }

    return mappings;
  }

  static async saveMapping(equipmentId, category, pdfUrl) {
    const cleanId = (equipmentId || '').toString().trim().toUpperCase();
    const cleanCategory = (category || '').toString().trim();
    const cleanUrl = (pdfUrl || '').toString().trim();

    const mappings = this.getLocalMappings();
    if (!mappings[cleanId]) mappings[cleanId] = {};
    mappings[cleanId][cleanCategory] = cleanUrl;
    this.saveLocalMappings(mappings);

    try {
      await GoogleSheetsService.appendData('PDF_Mappings!A:C', [
        [cleanId, cleanCategory, cleanUrl, new Date().toISOString()],
      ]);
    } catch (err) {
      console.warn('Could not append PDF mapping to Google Sheets:', err.message);
    }

    return mappings;
  }

  static async deleteMapping(equipmentId, category) {
    const cleanId = (equipmentId || '').toString().trim().toUpperCase();
    const cleanCategory = (category || '').toString().trim();

    const mappings = this.getLocalMappings();
    if (mappings[cleanId] && mappings[cleanId][cleanCategory]) {
      delete mappings[cleanId][cleanCategory];
      if (Object.keys(mappings[cleanId]).length === 0) {
        delete mappings[cleanId];
      }
      this.saveLocalMappings(mappings);
    }
    return mappings;
  }

  static getPdfLink(mappings, plannerNo, categoryName) {
    if (!mappings || !plannerNo) return '';
    const pNo = plannerNo.toString().trim().toUpperCase();
    if (!mappings[pNo]) return '';

    if (mappings[pNo][categoryName]) return mappings[pNo][categoryName];

    const catLower = categoryName.toLowerCase().replace(/[\s\-_]+/g, '');
    for (const [key, url] of Object.entries(mappings[pNo])) {
      if (key.toLowerCase().replace(/[\s\-_]+/g, '') === catLower) {
        return url;
      }
    }
    return '';
  }
}

module.exports = PdfMappingService;
