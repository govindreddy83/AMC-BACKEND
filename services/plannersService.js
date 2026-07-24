const GoogleSheetsService = require('./googleSheetsService');

/**
 * Service for fetching and filtering planners by area from Google Sheets.
 */
class PlannersService {
  /**
   * Get planner numbers filtered by area
   * @param {string} area e.g. "P1"
   * @returns {Promise<Array<{plannerNo: string}>>}
   */
  static async getPlannersByArea(area) {
    if (!area) {
      return [];
    }

    const normalizedArea = area.trim().toUpperCase();
    let rawRows = [];

    try {
      // Try reading from "Planner" sheet first
      rawRows = await GoogleSheetsService.readRawData('Planner!A1:Z500');
    } catch (error) {
      // Fallback to Sheet1 if Planner sheet tab doesn't exist
      try {
        rawRows = await GoogleSheetsService.readRawData('Sheet1!A1:Z500');
      } catch (fallbackError) {
        console.warn('⚠️ Could not fetch from Sheet1:', fallbackError.message);
      }
    }

    const plannerNumbers = [];

    if (rawRows && rawRows.length > 0) {
      const headers = rawRows[0].map((cell) => cell.toString().toLowerCase().trim());
      const areaIndex = headers.findIndex((h) =>
        ['area', 'block details', 'block_details', 'block'].includes(h)
      );
      const plannerNoIndex = headers.findIndex((h) =>
        ['plannerno', 'planner_no', 'code', 'planner no', 'equipment id', 'equipment_id'].includes(h)
      );

      if (areaIndex !== -1 && plannerNoIndex !== -1) {
        // Start from index 2 since index 0 and 1 are headers
        for (let i = 2; i < rawRows.length; i++) {
          const rowArea = rawRows[i][areaIndex]
            ? rawRows[i][areaIndex].toString().trim().toUpperCase()
            : '';
          const codeVal = rawRows[i][plannerNoIndex]
            ? rawRows[i][plannerNoIndex].toString().trim()
            : '';

          if (rowArea === normalizedArea && codeVal) {
            plannerNumbers.push(codeVal);
          }
        }
      }
    }

    // Fallback default planner items if keyfile not configured or sheet is empty
    if (plannerNumbers.length === 0) {
      const fallbackMap = {
        P1: ['P1/WEB/001', 'P1/WEB/002', 'P1/WEB/003', 'P1/WEB/004'],
        QC: ['QC/WEB/001', 'QC/WEB/002'],
        P2: ['P2/WEB/001', 'P2/WEB/002'],
        P3: ['P3/WEB/001', 'P3/WEB/002'],
      };

      const matchedList = fallbackMap[normalizedArea] || [
        `${normalizedArea}/WEB/001`,
        `${normalizedArea}/WEB/002`,
      ];
      matchedList.forEach((code) => plannerNumbers.push(code));
    }

    return plannerNumbers.map((code) => ({
      plannerNo: code,
    }));
  }
}

module.exports = PlannersService;
