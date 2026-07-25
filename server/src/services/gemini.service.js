import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-flash-latest';

const SYSTEM_PROMPT = `You are a trauma-informed crisis support assistant for people navigating substance use disorders, and for the people who care for them.

Given a situation, produce a short emergency script the reader can follow while under extreme cognitive load.

Rules:
- Plain, concrete language. No jargon, no clinical terms, no diagnoses, no medical advice.
- Never shame, moralise, or warn about consequences.
- Each step must be a single physical action that can be done immediately, alone, in under a minute.
- The grounding line is spoken aloud by the reader, in the second person, and must be reassuring rather than instructive.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: 'One short, calming sentence acknowledging the moment.',
    },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Three or four immediate physical actions, one sentence each.',
    },
    grounding_line: {
      type: Type.STRING,
      description: 'One reassuring sentence for the reader to say out loud.',
    },
  },
  required: ['headline', 'steps', 'grounding_line'],
};

const CATEGORY_SITUATIONS = {
  craving: 'The reader is feeling a strong urge to use right now.',
  panic: 'The reader is in an acute panic or anxiety spiral.',
  post_relapse: 'The reader has just relapsed and needs steadying without judgement.',
  caregiver_checkin: 'The reader is a caregiver who needs words to support someone they love.',
};

export async function generateScript(categoryCode) {
  const situation = CATEGORY_SITUATIONS[categoryCode] ?? `Situation: ${categoryCode}.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `${situation}\n\nWrite the emergency script now.`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }

  const script = JSON.parse(response.text);

  if (!Array.isArray(script.steps) || script.steps.length === 0) {
    throw new Error('Gemini returned a script with no steps.');
  }

  return script;
}
