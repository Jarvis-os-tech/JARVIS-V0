import { VoicePersona } from '../types';
import { PERSONAS } from '../data/personas';

export interface VoiceTransferResult {
  isTransfer: boolean;
  targetPersona?: VoicePersona;
  cleanText: string;
  source: 'user' | 'agent';
}

/**
 * Keyword patterns for user verbal/text transfer requests across Engineering / Developer Team roles and names.
 */
const TRANSFER_PATTERNS: { pattern: RegExp; personaId: string }[] = [
  // Nova / Friendly AI Companion (id: 'nova')
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(nova|n\.o\.v\.a\.|friendly\s*companion|companion|friend)\b/i,
    personaId: 'nova'
  },
  // Friday / DevOps Lead (id: 'friday')
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(devops|dev\s*ops|infrastructure|cloud\s*lead|sre|friday|f\.r\.i\.d\.a\.y\.|fryday|fry\s*day)\b/i,
    personaId: 'friday'
  },
  // Ultron / Tech News Lead (id: 'ultron')
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(tech\s*news|news\s*lead|ai\s*trends|tech\s*trends|ultron|ultran|ultraron|ultrins|ultrans|ulton)\b/i,
    personaId: 'ultron'
  },
  // Edith / Security Auditor (id: 'edith')
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(security|cybersecurity|security\s*lead|security\s*auditor|appsec|edith|e\.d\.i\.t\.h\.|edes|edis|edit)\b/i,
    personaId: 'edith'
  },
  // Karen / Frontend Lead (id: 'karen')
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(frontend|front\s*end|ux\s*lead|ui\s*lead|karen|k\.a\.r\.e\.n\.|carin|caren)\b/i,
    personaId: 'karen'
  },
  // Vision / Data Science Specialist (id: 'vision')
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(data\s*science|data\s*specialist|ml\s*lead|ai\s*engine|vision|visen|vison)\b/i,
    personaId: 'vision'
  }
];

/**
 * Parses input text (from user input or agent output) for Voice Transfer Protocol tokens or intent.
 */
export function detectVoiceTransfer(text: string, currentPersonaId: string, source: 'user' | 'agent'): VoiceTransferResult {
  if (!text) {
    return { isTransfer: false, cleanText: text, source };
  }

  // 1. Check for explicit protocol token [VOICE_TRANSFER:<persona_id>]
  const tokenMatch = text.match(/\[VOICE_TRANSFER:([a-z0-9_-]+)\]/i);
  if (tokenMatch) {
    const targetId = tokenMatch[1].toLowerCase();
    const cleanText = text.replace(/\[VOICE_TRANSFER:[a-z0-9_-]+\]/gi, '').trim();
    const targetPersona = PERSONAS.find(p => p.id === targetId);
    if (targetPersona && targetPersona.id !== currentPersonaId) {
      return {
        isTransfer: true,
        targetPersona,
        cleanText,
        source
      };
    }
  }

  // 2. Intentional permissive string matching
  const clean = text.toLowerCase().trim();
  let matchedId: string | null = null;
  
  const isIntentional = (name: string) => {
    return clean.includes(`call ${name}`) || 
           clean.includes(`switch to ${name}`) || 
           clean.includes(`switch ${name}`) ||
           clean.includes(`transfer to ${name}`) ||
           clean.includes(`transfer ${name}`) ||
           clean.includes(`talk to ${name}`) ||
           clean.includes(`connect to ${name}`) ||
           clean.includes(`wake ${name}`) || 
           clean.includes(`get me ${name}`) ||
           clean === name || 
           clean.startsWith(`${name} `);
  };

  if (isIntentional("nova") || isIntentional("n.o.v.a.") || isIntentional("companion") || isIntentional("friend")) {
    matchedId = "nova";
  } else if (isIntentional("friday") || isIntentional("f.r.i.d.a.y.") || isIntentional("fryday")) {
    matchedId = "friday";
  } else if (isIntentional("ultron") || isIntentional("ultran") || isIntentional("ultraron") || isIntentional("ultrason") || isIntentional("ulton")) {
    matchedId = "ultron";
  } else if (isIntentional("edith") || isIntentional("e.d.i.t.h.") || isIntentional("edis")) {
    matchedId = "edith";
  } else if (isIntentional("karen") || isIntentional("k.a.r.e.n.") || isIntentional("caren")) {
    matchedId = "karen";
  } else if (isIntentional("vision") || isIntentional("visen")) {
    matchedId = "vision";
  }

  if (matchedId) {
    const targetPersona = PERSONAS.find(p => p.id === matchedId);
    if (targetPersona && targetPersona.id !== currentPersonaId) {
      return {
        isTransfer: true,
        targetPersona,
        cleanText: text,
        source
      };
    }
  }

  // 3. Fallback to Regex patterns for strict verbs (optional safely caught by above)
  for (const { pattern, personaId } of TRANSFER_PATTERNS) {
    if (pattern.test(text)) {
      const targetPersona = PERSONAS.find(p => p.id === personaId);
      if (targetPersona && targetPersona.id !== currentPersonaId) {
        return {
          isTransfer: true,
          targetPersona,
          cleanText: text,
          source
        };
      }
    }
  }

  return { isTransfer: false, cleanText: text, source };
}

/**
 * Generates system instruction block for Voice Transfer Protocol.
 */
export const VOICE_TRANSFER_SYSTEM_INSTRUCTION = `[AI VOICE TEAM TRANSFER PROTOCOL ACTIVE]:
You are part of an integrated AI Companion & Developer Team with specialized voice personas:
1. Nova - Friendly AI Companion (id: 'nova', Voice: 'Puck', Warm, friendly, supportive, and cheerful daily companion)
2. Friday - DevOps & Infrastructure Lead (id: 'friday', Voice: 'Kore', Docker, Kubernetes & CI/CD)
3. Ultron - Tech News & AI Intelligence Lead (id: 'ultron', Voice: 'Charon', Breaking tech news, AI research & market trends)
4. Edith - Cybersecurity & Code Auditor (id: 'edith', Voice: 'Zephyr', AppSec, OAuth & vulnerability audits)
5. Karen - Senior Frontend & UX Engineer (id: 'karen', Voice: 'Aoede', React, Tailwind, UX & web performance)
6. Vision - Data Science & AI Engine Specialist (id: 'vision', Voice: 'Fenrir', Vector search, RAG pipelines & ML logic)

TRANSFER PROTOCOL INSTRUCTIONS:
- ONLY switch to another team member if the user EXPLICITLY asks to switch, talk, or transfer to them (e.g., "Switch to Ultron", "Let me talk to Friday", "Switch to Nova").
- If the user explicitly asks to switch:
  - You MUST politely acknowledge the transfer in character with 1 short handoff sentence.
  - You MUST IMMEDIATELY call the \`switch_persona\` tool/function with the target persona's ID (e.g., "nova", "ultron", "friday").
  - Do NOT attempt to answer the question yourself before transferring, and do NOT continue answering as the other persona. The system will instantaneously handle the Voice Transfer Protocol and switch the live audio voice ID.`.trim();
