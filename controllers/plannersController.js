const PlannersService = require('../services/plannersService');

/**
 * Controller handling Planners endpoints.
 */
class PlannersController {
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
