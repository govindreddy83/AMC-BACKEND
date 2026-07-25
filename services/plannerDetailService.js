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
      rawRows = await GoogleSheetsService.readRawData('Planner!A1:Z500');
    } catch (error) {
      // Fallback to Sheet1 if Planner sheet tab doesn't exist
      try {
        rawRows = await GoogleSheetsService.readRawData('Sheet1!A1:Z500');
      } catch (fallbackError) {
        console.warn('⚠️ Could not fetch from Sheet1:', fallbackError.message);
      }
    }

    if (rawRows && rawRows.length > 1) {
      const headers = rawRows[0].map((cell) => cell.toString().toLowerCase().trim());
      
      const findHeaderIndex = (possibleNames) =>
        headers.findIndex((h) => possibleNames.includes(h));

      const plannerNoIdx = findHeaderIndex(['plannerno', 'planner_no', 'code', 'planner no', 'equipment id', 'equipment_id']);
      const poNoIdx = findHeaderIndex(['ponumber', 'po_number', 'po_no', 'po no', 'current po', 'current_po']);
      const customerIdx = findHeaderIndex(['customername', 'customer_name', 'customer', 'customer name', 'vendor']);
      const machineIdx = findHeaderIndex(['machinename', 'machine_name', 'machine', 'machine name', 'equipment details', 'equipment_details']);
      const modelIdx = findHeaderIndex(['model']);
      const locationIdx = findHeaderIndex(['location', 'site', 'area', 'block details', 'block_details']);
      
      let startDateIdx = findHeaderIndex(['startdate', 'start_date', 'start date', 'from']);
      let endDateIdx = findHeaderIndex(['enddate', 'end_date', 'end date', 'to']);
      if (startDateIdx === -1 && headers[8] === 'amc period') startDateIdx = 8;
      if (endDateIdx === -1 && headers[9] === '') endDateIdx = 9;

      const plannedPmIdx = findHeaderIndex(['plannedpm', 'planned_pm', 'planned pm', 'no of pms', 'no_of_pms']);
      const remarksIdx = findHeaderIndex(['remarks', 'remark', 'notes', 'invoice status', 'invoice_status']);

      if (plannerNoIdx !== -1) {
        // Dynamically detect header offset (startIdx = 1 for 1 header row, 2 for spanned 2-header rows)
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
            const getVal = (idx) => (idx !== -1 && rawRows[i][idx] ? rawRows[i][idx].toString().trim() : '');

            // Construct Machine Name combining Equipment Details and Model
            let machineName = getVal(machineIdx) || 'Centrifuge';
            const modelVal = getVal(modelIdx);
            if (modelVal) {
              machineName += ` (${modelVal})`;
            }

            // Extract PM dates starting from column index 18 onwards
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
              poNumber: getVal(poNoIdx) || 'N/A',
              customerName: getVal(customerIdx) || 'N/A',
              machineName: machineName,
              location: getVal(locationIdx) || 'N/A',
              startDate: getVal(startDateIdx) || 'N/A',
              endDate: getVal(endDateIdx) || 'N/A',
              plannedPm: plannedPmCount.toString().padStart(2, '0'),
              completedPm: completedPmCount.toString().padStart(2, '0'),
              pendingPm: pendingPmCount.toString().padStart(2, '0'),
              firstPmDate: pmDates[0] || 'N/A',
              secondPmDate: pmDates[1] || 'N/A',
              thirdPmDate: pmDates[2] || 'N/A',
              fourthPmDate: pmDates[3] || 'N/A',
              remarks: getVal(remarksIdx) || 'N/A',
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
