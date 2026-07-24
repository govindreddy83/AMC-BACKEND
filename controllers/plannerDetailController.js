const PlannerDetailService = require('../services/plannerDetailService');

/**
 * Controller for retrieving complete AMC Planner details by Planner Number.
 */
class PlannerDetailController {
  /**
   * GET /api/planner/:plannerNo (or GET /api/planner?plannerNo=P1/WEB/002)
   */
  static async getPlannerDetails(req, res, next) {
    try {
      let plannerNo = req.params.plannerNo || req.params[0] || req.query.plannerNo;

      if (!plannerNo && req.path) {
        // Strip leading slash if captured via wildcard
        plannerNo = req.path.replace(/^\//, '');
      }

      if (plannerNo) {
        plannerNo = decodeURIComponent(plannerNo);
      }

      if (!plannerNo) {
        return res.status(400).json({
          success: false,
          error: 'Planner Number is required (e.g. /api/planner/P1/WEB/002)',
        });
      }

      const result = await PlannerDetailService.getPlannerByNo(plannerNo);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: `Planner detail for "${plannerNo}" not found.`,
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PlannerDetailController;
