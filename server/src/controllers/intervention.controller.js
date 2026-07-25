import * as interventionService from '../services/intervention.service.js';

export async function create(req, res, next) {
  try {
    const { category_code: categoryCode, local_hour: localHour } = req.body ?? {};

    if (!categoryCode) {
      return res.status(400).json({ error: 'category_code is required.' });
    }
    if (localHour !== undefined && !Number.isInteger(localHour)) {
      return res.status(400).json({ error: 'local_hour must be an integer between 0 and 23.' });
    }

    const isKnown = await interventionService.categoryExists(categoryCode);
    if (!isKnown) {
      return res.status(400).json({ error: 'Unknown category_code.' });
    }

    res
      .status(201)
      .json(await interventionService.createIntervention(req.userId, categoryCode, localHour));
  } catch (err) {
    next(err);
  }
}

export async function categories(req, res, next) {
  try {
    res.json(await interventionService.listCategories());
  } catch (err) {
    next(err);
  }
}
