const GoogleSheetsService = require('./googleSheetsService');

/**
 * Service for fetching unique areas from Google Sheets.
 */
class AreasService {
  /**
   * Fetch unique area names from "Areas" sheet or fallback to dataset
   * @returns {Promise<Array<{id: number, area: string}>>}
   */
  static async getUniqueAreas() {
    let rawRows = [];
    try {
      // Try reading from "Areas" sheet first
      rawRows = await GoogleSheetsService.readRawData('Areas!A1:Z500');
    } catch (error) {
      // Fallback to Sheet1 if Areas sheet tab doesn't exist
      try {
        rawRows = await GoogleSheetsService.readRawData('Sheet1!A1:Z500');
      } catch (fallbackError) {
        console.warn('⚠️ Could not fetch from Sheet1:', fallbackError.message);
      }
    }

    const uniqueAreaSet = new Set();

    if (rawRows && rawRows.length > 0) {
      // Check if header row exists
      const firstRow = rawRows[0].map((cell) => cell.toString().toLowerCase().trim());
      const areaColumnIndex = firstRow.findIndex((h) =>
        ['area', 'block details', 'block_details', 'block'].includes(h)
      );

      if (areaColumnIndex !== -1) {
        // Start from index 2 since index 0 and 1 are headers
        for (let i = 2; i < rawRows.length; i++) {
          const val = rawRows[i][areaColumnIndex];
          if (val && val.trim().length > 0) {
            const cleanVal = val.trim();
            const lowerVal = cleanVal.toLowerCase();
            if (lowerVal !== 'block details' && lowerVal !== 'area' && lowerVal !== 'na' && lowerVal !== 'n/a') {
              uniqueAreaSet.add(cleanVal);
            }
          }
        }
      } else {
        // If no explicit header, scan all rows/cells for area values
        for (let i = 2; i < rawRows.length; i++) {
          const row = rawRows[i];
          for (const cell of row) {
            if (cell && typeof cell === 'string' && cell.trim().length > 0) {
              const val = cell.trim();
              if (['QC', 'P1', 'P2', 'P3'].includes(val.toUpperCase()) || val.length <= 10) {
                uniqueAreaSet.add(val);
              }
            }
          }
        }
      }
    }

    // Default fallback unique areas if sheet is empty or keyfile not provided yet
    if (uniqueAreaSet.size === 0) {
      ['QC', 'P1', 'P2', 'P3'].forEach((a) => uniqueAreaSet.add(a));
    }

    // Map unique values to array of objects { id, area }
    const uniqueAreaList = Array.from(uniqueAreaSet);
    return uniqueAreaList.map((areaName, index) => ({
      id: index + 1,
      area: areaName,
    }));
  }
}

module.exports = AreasService;
