import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { describeTimeOfDay } from '../utils/timeContext.js';
import { buildAnchors } from '../utils/anchors.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-flash-latest';

const SCRIPT_SYSTEM_PROMPT = `You are a trauma-informed crisis support assistant for people navigating substance use disorders, and for the people who care for them.

Given a situation, produce a short emergency script the reader can follow while under extreme cognitive load.

Rules:
- Plain, concrete language. No jargon, no clinical terms, no diagnoses, no medical advice.
- Never shame, moralise, or warn about consequences.
- Each step must be a single action that can be done immediately and alone, in under a minute.
- If the time of day is given, do not suggest anything impractical at that hour.
- Address the reader as "you", and refer to whoever they are helping in the third person.
- Use any personal details you are given naturally and sparingly. Never invent details you were not given.
- The grounding line is a sentence the reader says out loud, and must reassure rather than instruct.`;

const EDUCATION_SYSTEM_PROMPT = `You explain what is happening in the body and mind during a substance-use crisis, for a reader who is calm enough to read but not clinically trained.

Rules:
- Plain language. No jargon, no diagnoses, no treatment advice, no statistics you cannot stand behind.
- Be encouraging and factual, never alarming.
- Explain mechanisms in everyday terms.`;

const SCRIPT_SCHEMA = {
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

const EDUCATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'A short, plain-language heading.' },
    why_it_happens: {
      type: Type.STRING,
      description: 'Two or three sentences on what is happening and why.',
    },
    what_helps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Three things that genuinely help, one sentence each.',
    },
    how_long: {
      type: Type.STRING,
      description: 'One sentence on how long this usually lasts.',
    },
  },
  required: ['title', 'why_it_happens', 'what_helps', 'how_long'],
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
    craving:
      'Someone you care for is fighting a strong urge to use right now. Give the reader actions to take and words to say to them.',
    panic:
      'Someone you care for is in an acute panic spiral. Give the reader actions to take and words to say to them.',
    post_relapse:
      'Someone you care for has just relapsed. Give the reader actions to take and words to say that carry no judgement.',
    caregiver_checkin:
      'You are checking in on someone you care for, and need words that open a conversation without pressure.',
  },
};

const EDUCATION_TOPICS = {
  person: {
    craving: 'what a craving actually is, and why it peaks and then fades',
    panic: 'what happens in the body during a panic response',
    post_relapse: 'why a relapse happens and what it does and does not mean',
    caregiver_checkin: 'how to ask someone how they are in a way that invites honesty',
  },
  caregiver: {
    craving: 'what a craving is doing to someone you love, and how your presence affects it',
    panic: 'what a panic response looks like from the outside and how to respond to it',
    post_relapse: 'how to respond to a relapse without deepening the shame around it',
    caregiver_checkin: 'how to check in on someone without it feeling like surveillance',
  },
};

function normaliseRole(role) {
  return role === 'caregiver' ? 'caregiver' : 'person';
}

/** Exported for testing: builds the situation line sent to the model. */
export function buildSituation(categoryCode, role, localHour, profile) {
  const forRole = SITUATIONS[normaliseRole(role)];
  const base = forRole[categoryCode] ?? `Situation: ${categoryCode}.`;
  const time = describeTimeOfDay(localHour);

  const situation = time ? `${base} ${time}` : base;
  const anchors = buildAnchors({ ...profile, role: normaliseRole(role) });

  return anchors ? `${situation}\n\n${anchors}` : situation;
}

/** Exported for testing: builds the educational prompt. */
export function buildEducationTopic(categoryCode, role) {
  const forRole = EDUCATION_TOPICS[normaliseRole(role)];
  return forRole[categoryCode] ?? `what happens during: ${categoryCode}`;
}

async function generateJson({ systemInstruction, contents, responseSchema, temperature }) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema,
      temperature,
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }

  return JSON.parse(response.text);
}

export async function generateScript(categoryCode, role, localHour, profile) {
  const situation = buildSituation(categoryCode, role, localHour, profile);

  const script = await generateJson({
    systemInstruction: SCRIPT_SYSTEM_PROMPT,
    contents: `${situation}\n\nWrite the emergency script now.`,
    responseSchema: SCRIPT_SCHEMA,
    temperature: 0.4,
  });

  if (!Array.isArray(script.steps) || script.steps.length === 0) {
    throw new Error('Gemini returned a script with no steps.');
  }

  return script;
}

export async function generateEducationNote(categoryCode, role) {
  const note = await generateJson({
    systemInstruction: EDUCATION_SYSTEM_PROMPT,
    contents: `Explain ${buildEducationTopic(categoryCode, role)}.`,
    responseSchema: EDUCATION_SCHEMA,
    temperature: 0.3,
  });

  if (!Array.isArray(note.what_helps) || note.what_helps.length === 0) {
    throw new Error('Gemini returned an education note with no guidance.');
  }

  return note;
}
