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

// Containers MediaRecorder produces that Gemini also accepts.
const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/aac',
  'audio/flac',
]);

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export async function createFromVoice(req, res, next) {
  try {
    const {
      audio_base64: audioBase64,
      mime_type: rawMimeType,
      local_hour: localHour,
    } = req.body ?? {};

    if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
      return res.status(400).json({ error: 'audio_base64 is required.' });
    }
    if (audioBase64.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: 'That recording is too long.' });
    }
    if (localHour !== undefined && !Number.isInteger(localHour)) {
      return res.status(400).json({ error: 'local_hour must be an integer between 0 and 23.' });
    }

    // MediaRecorder reports types like "audio/webm;codecs=opus".
    const mimeType = String(rawMimeType ?? '').split(';')[0].trim();
    if (!AUDIO_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({ error: 'Unsupported audio format.' });
    }

    const intervention = await interventionService.createVoiceIntervention(
      req.userId,
      audioBase64,
      mimeType,
      localHour
    );

    if (!intervention) {
      return res.status(422).json({ error: "I couldn't make out what you said." });
    }

    res.status(201).json(intervention);
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
