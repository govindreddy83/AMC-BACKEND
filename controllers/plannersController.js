const PlannersService = require('../services/plannersService');
const PlannerDetailService = require('../services/plannerDetailService');

/**
 * Controller handling Planners endpoints.
 */
class PlannersController {
  /**
   * GET /api/planners/all
   * Returns array of all complete planner objects
   */
  static async getAllPlanners(req, res, next) {
    try {
      const planners = await PlannerDetailService.getAllPlanners();
      return res.status(200).json(planners);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/planners/codes
   * Returns array of unique equipment codes/IDs
   */
  static async getAllCodes(req, res, next) {
    try {
      const codes = await PlannersService.getAllPlannerCodes();
      return res.status(200).json({ success: true, codes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/planners?area=P1
   * Returns array of [{ plannerNo: "P1/WEB/001" }, ...]
   */
  static async getPlanners(req, res, next) {
    try {
      const area = req.query.area;
      if (!area) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter "area" is required (e.g. /api/planners?area=P1)',
        });
      }

      const planners = await PlannersService.getPlannersByArea(area);
      return res.status(200).json(planners);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PlannersController;
