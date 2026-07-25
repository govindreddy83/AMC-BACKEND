const GoogleSheetsService = require('./googleSheetsService');

/**
 * Service for fetching complete AMC Planner details by Planner Number.
 */
class PlannerDetailService {
  /**
   * Get planner details by plannerNo
   * @param {string} plannerNo e.g., "P1/WEB/002"
   * @returns {Promise<Object>} Object containing all planner details
   */
  static async getPlannerByNo(plannerNo) {
    if (!plannerNo) {
      return null;
    }

    const targetNo = plannerNo.toString().trim().toUpperCase();
    let rawRows = [];

    try {
      rawRows = await GoogleSheetsService.readRawData('Planner!A1:AZ500');
    } catch (error) {
      // Fallback to Sheet1 if Planner sheet tab doesn't exist
      try {
        rawRows = await GoogleSheetsService.readRawData('Sheet1!A1:AZ500');
      } catch (fallbackError) {
        console.warn('⚠️ Could not fetch from Sheet1:', fallbackError.message);
      }
    }

    if (rawRows && rawRows.length > 1) {
      const cleanHeader = (h) => h ? h.toString().toLowerCase().replace(/[\r\n\s]+/g, ' ').trim() : '';
      const headers = rawRows[0].map(cleanHeader);

      const findHeaderIndex = (possibleNames) => {
        const normalizedTargets = possibleNames.map(cleanHeader);
        return headers.findIndex((h) => normalizedTargets.includes(h));
      };

      const plannerNoIdx = findHeaderIndex(['plannerno', 'planner_no', 'code', 'planner no', 'equipment id', 'equipment_id']);
      const poNoIdx = findHeaderIndex(['ponumber', 'po_number', 'po_no', 'po no', 'current po', 'current_po (2025-2026)']);
      const customerIdx = findHeaderIndex(['customername', 'customer_name', 'customer', 'customer name', 'vendor']);
      const machineIdx = findHeaderIndex(['machinename', 'machine_name', 'machine', 'machine name', 'equipment details', 'equipment_details', 'equipment name']);
      const modelIdx = findHeaderIndex(['model']);
      const locationIdx = findHeaderIndex(['location', 'site']);
      const areaIdx = findHeaderIndex(['area', 'block details', 'block_details']);
      
      let startDateIdx = findHeaderIndex(['startdate', 'start_date', 'start date', 'from', 'amc start date']);
      let endDateIdx = findHeaderIndex(['enddate', 'end_date', 'end date', 'to', 'amc end date']);

      const plannedPmIdx = findHeaderIndex(['plannedpm', 'planned_pm', 'planned pm', 'no of pms', 'no_of_pms']);
      const remarksIdx = findHeaderIndex(['remarks', 'remark', 'notes', 'invoice status', 'invoice_status', 'invoice status (2025-2026)']);

      // History Column Indices
      const prevPo2023_2024Idx = findHeaderIndex(['previous po (2023-2024)']);
      const prevPo2024_2025Idx = findHeaderIndex(['previous po (2024-2025)']);
      const firstPm2024_2025Idx = findHeaderIndex(['first pm 2024-2025']);
      const secondPm2024_2025Idx = findHeaderIndex(['second pm 2024-2025']);
      const breakdown2024_2025Idx = findHeaderIndex(['break down 2024-2025', 'breakdown 2024-2025']);
      const calibration2024_2025Idx = findHeaderIndex(['calibration 2024-2025']);
      const firstPm2025_2026Idx = findHeaderIndex(['first pm 2025-2026']);
      const calibration2025_2026Idx = findHeaderIndex(['calibration 2025-2026']);
      const secondPm2025_2026Idx = findHeaderIndex(['second pm 2025-2026']);
      const breakdown2025_2026Idx = findHeaderIndex(['breakdown 2025-2026', 'break down 2025-2026']);

      if (plannerNoIdx !== -1) {
        let startIdx = 1;
        if (rawRows.length > 1) {
          const row1Val = rawRows[1][plannerNoIdx] ? rawRows[1][plannerNoIdx].toString().toLowerCase().trim() : '';
          if (row1Val === 'plannerno' || row1Val === 'planner_no' || row1Val === 'code' || row1Val === 'planner no' || row1Val === 'equipment id') {
            startIdx = 2;
          }
        }

        for (let i = startIdx; i < rawRows.length; i++) {
          const cellVal = rawRows[i][plannerNoIdx]
            ? rawRows[i][plannerNoIdx].toString().trim().toUpperCase()
            : '';

          if (cellVal === targetNo) {
            const getVal = (idx) => (idx !== -1 && rawRows[i][idx] ? rawRows[i][idx].toString().trim() : 'N/A');

            let machineName = getVal(machineIdx);
            if (machineName === 'N/A') machineName = 'Centrifuge';
            const modelVal = getVal(modelIdx);
            if (modelVal && modelVal !== 'N/A') {
              machineName += ` (${modelVal})`;
            }

            const pmDates = [];
            for (let col = 18; col < rawRows[i].length; col++) {
              const val = rawRows[i][col] ? rawRows[i][col].toString().trim() : '';
              if (val && !val.toLowerCase().includes('installed') && !val.toLowerCase().includes('install')) {
                pmDates.push(val);
              }
            }

            const plannedPmCount = parseInt(getVal(plannedPmIdx)) || 2;
            const completedPmCount = pmDates.length;
            const pendingPmCount = Math.max(0, plannedPmCount - completedPmCount);

            return {
              plannerNumber: rawRows[i][plannerNoIdx] || plannerNo,
              poNumber: getVal(poNoIdx),
              customerName: getVal(customerIdx),
              machineName: machineName,
              location: getVal(locationIdx),
              area: getVal(areaIdx),
              startDate: getVal(startDateIdx),
              endDate: getVal(endDateIdx),
              plannedPm: plannedPmCount.toString().padStart(2, '0'),
              completedPm: completedPmCount.toString().padStart(2, '0'),
              pendingPm: pendingPmCount.toString().padStart(2, '0'),
              firstPmDate: pmDates[0] || 'N/A',
              secondPmDate: pmDates[1] || 'N/A',
              thirdPmDate: pmDates[2] || 'N/A',
              fourthPmDate: pmDates[3] || 'N/A',
              remarks: getVal(remarksIdx),
              history: {
                prevPo2023_2024: getVal(prevPo2023_2024Idx),
                prevPo2024_2025: getVal(prevPo2024_2025Idx),
                firstPm2024_2025: getVal(firstPm2024_2025Idx),
                secondPm2024_2025: getVal(secondPm2024_2025Idx),
                breakdown2024_2025: getVal(breakdown2024_2025Idx),
                calibration2024_2025: getVal(calibration2024_2025Idx),
                firstPm2025_2026: getVal(firstPm2025_2026Idx),
                calibration2025_2026: getVal(calibration2025_2026Idx),
                secondPm2025_2026: getVal(secondPm2025_2026Idx),
                breakdown2025_2026: getVal(breakdown2025_2026Idx),
              },
            };
          }
        }
      }
    }

    // Return null if row not found or keyfile missing
    return null;
  }
}

module.exports = PlannerDetailService;
