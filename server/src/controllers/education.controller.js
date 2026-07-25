import * as educationService from '../services/education.service.js';
import * as interventionService from '../services/intervention.service.js';

export async function read(req, res, next) {
  try {
    const { categoryCode } = req.params;

    if (!(await interventionService.categoryExists(categoryCode))) {
      return res.status(404).json({ error: 'Unknown category.' });
    }

    res.json(await educationService.getEducationNote(req.userId, categoryCode));
  } catch (err) {
    next(err);
  }
}
