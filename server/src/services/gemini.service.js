import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-flash-latest';

const SYSTEM_PROMPT = `You are a trauma-informed crisis support assistant for people navigating substance use disorders, and for the people who care for them.

Given a situation, produce a short emergency script the reader can follow while under extreme cognitive load.

Rules:
- Plain, concrete language. No jargon, no clinical terms, no diagnoses, no medical advice.
- Never shame, moralise, or warn about consequences.
- Each step must be a single action that can be done immediately and alone, in under a minute.
- Address the reader as "you", and refer to whoever they are helping in the third person.
- The grounding line is a sentence the reader says out loud, and must reassure rather than instruct.`;

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
      description: 'Three or four immediate actions, one sentence each.',
    },
    grounding_line: {
      type: Type.STRING,
      description: 'One reassuring sentence for the reader to say out loud.',
    },
  },
  required: ['headline', 'steps', 'grounding_line'],
};

/**
 * A caregiver and the person themselves face the same moment from opposite
 * sides, so the same category has to yield a different script for each.
 */
const SITUATIONS = {
  person: {
    craving: 'You are feeling a strong urge to use right now.',
    panic: 'You are in an acute panic or anxiety spiral.',
    post_relapse: 'You have just relapsed and need steadying, without judgement.',
    caregiver_checkin: 'You want to check in on someone you are supporting.',
  },
  caregiver: {
    craving: 'Someone you care for is fighting a strong urge to use right now. Give the reader actions to take and words to say to them.',
    panic: 'Someone you care for is in an acute panic spiral. Give the reader actions to take and words to say to them.',
    post_relapse: 'Someone you care for has just relapsed. Give the reader actions to take and words to say that carry no judgement.',
    caregiver_checkin: 'You are checking in on someone you care for, and need words that open a conversation without pressure.',
  },
};

/** Exported for testing: builds the situation line sent to the model. */
export function buildSituation(categoryCode, role) {
  const forRole = SITUATIONS[role] ?? SITUATIONS.person;
  return forRole[categoryCode] ?? `Situation: ${categoryCode}.`;
}

export async function generateScript(categoryCode, role) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `${buildSituation(categoryCode, role)}\n\nWrite the emergency script now.`,
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
