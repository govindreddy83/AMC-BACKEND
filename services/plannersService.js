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
        // Dynamically detect header offset (startIdx = 1 for 1 header row, 2 for spanned 2-header rows)
        let startIdx = 1;
        if (rawRows.length > 1) {
          const row1Val = rawRows[1][areaIndex] ? rawRows[1][areaIndex].toString().toLowerCase().trim() : '';
          if (row1Val === 'block details' || row1Val === 'area' || row1Val === 'to' || row1Val === 'from') {
            startIdx = 2;
          }
        }

        for (let i = startIdx; i < rawRows.length; i++) {
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

  /**
   * Get all unique planner codes / equipment IDs across all sheets
   * @returns {Promise<Array<string>>}
   */
  static async getAllPlannerCodes() {
    let rawRows = [];
    try {
      rawRows = await GoogleSheetsService.readRawData('Planner!A1:Z500');
    } catch (error) {
      try {
        rawRows = await GoogleSheetsService.readRawData('Sheet1!A1:Z500');
      } catch (fallbackError) {
        console.warn('⚠️ Could not fetch from Sheet1:', fallbackError.message);
      }
    }

    const codesSet = new Set();
    if (rawRows && rawRows.length > 0) {
      const headers = rawRows[0].map((cell) => cell.toString().toLowerCase().trim());
      const plannerNoIndex = headers.findIndex((h) =>
        ['plannerno', 'planner_no', 'code', 'planner no', 'equipment id', 'equipment_id'].includes(h)
      );

      if (plannerNoIndex !== -1) {
        let startIdx = 1;
        if (rawRows.length > 1) {
          const row1Val = rawRows[1][plannerNoIndex] ? rawRows[1][plannerNoIndex].toString().toLowerCase().trim() : '';
          if (row1Val === 'plannerno' || row1Val === 'planner_no' || row1Val === 'code' || row1Val === 'planner no' || row1Val === 'equipment id') {
            startIdx = 2;
          }
        }
        for (let i = startIdx; i < rawRows.length; i++) {
          const codeVal = rawRows[i][plannerNoIndex] ? rawRows[i][plannerNoIndex].toString().trim() : '';
          if (codeVal) {
            codesSet.add(codeVal);
          }
        }
      }
    }
    return Array.from(codesSet);
  }
}

module.exports = PlannersService;
