const AreasService = require('../services/areasService');

/**
 * Controller handling Areas endpoints.
 */
class AreasController {
  /**
   * GET /api/areas
   * Returns array of unique area objects [{ id: 1, area: "QC" }, ...]
   */
  static async getAreas(req, res, next) {
    try {
      const areas = await AreasService.getUniqueAreas();
      return res.status(200).json(areas);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AreasController;
