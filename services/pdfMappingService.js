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
      await GoogleSheetsService.ensureTabExists('PDF_Mappings');
      const rows = await GoogleSheetsService.readRawData('PDF_Mappings!A1:C500');
      if (rows && rows.length > 0) {
        // Skip header row
        const dataRows = rows[0][0] === 'Equipment ID' ? rows.slice(1) : rows;
        dataRows.forEach((row) => {
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
      console.warn('Could not fetch mappings from Google Sheets:', sheetsErr.message);
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
      await GoogleSheetsService.ensureTabExists('PDF_Mappings');
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

    // Fetch all to ensure we have latest from Sheets
    const mappings = await this.fetchAllMappings();

    if (mappings[cleanId] && mappings[cleanId][cleanCategory]) {
      delete mappings[cleanId][cleanCategory];
      if (Object.keys(mappings[cleanId]).length === 0) {
        delete mappings[cleanId];
      }
      this.saveLocalMappings(mappings);

      // Rewrite Google Sheets tab to reflect deletion
      try {
        await GoogleSheetsService.ensureTabExists('PDF_Mappings');
        
        const newRows = [['Equipment ID', 'Category', 'PDF URL', 'Timestamp']];
        for (const [eq, cats] of Object.entries(mappings)) {
          for (const [cat, url] of Object.entries(cats)) {
            newRows.push([eq, cat, url, new Date().toISOString()]);
          }
        }
        
        await GoogleSheetsService.clearData('PDF_Mappings!A:D');
        await GoogleSheetsService.updateData('PDF_Mappings!A1', newRows);
      } catch (err) {
        console.warn('Could not sync deletion to Google Sheets:', err.message);
      }
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
