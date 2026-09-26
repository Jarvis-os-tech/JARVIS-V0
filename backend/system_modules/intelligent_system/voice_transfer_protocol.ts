import { VoicePersona, VoiceTransferResult } from './intelligent_types';
import { PERSONAS } from './personas';

/**
 * Keyword patterns for user verbal/text transfer requests across Engineering / Developer Team roles and names.
 */
const TRANSFER_PATTERNS: { pattern: RegExp; personaId: string }[] = [
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(tech\s*lead|systems?\s*architect|principal\s*architect|architect|lead\s*engineer|jarvis|j\.a\.r\.v\.i\.s\.|jarvsi|jarv|jarviss)\b/i,
    personaId: 'jarvis'
  },
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(devops|dev\s*ops|infrastructure|cloud\s*lead|sre|friday|f\.r\.i\.d\.a\.y\.|fryday|fry\s*day)\b/i,
    personaId: 'friday'
  },
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(tech\s*news|news\s*lead|ai\s*trends|tech\s*trends|ultron|ultran|ultraron|ultrins|ultrans|ulton)\b/i,
    personaId: 'ultron'
  },
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(security|cybersecurity|security\s*lead|security\s*auditor|appsec|edith|e\.d\.i\.t\.h\.|edes|edis|edit)\b/i,
    personaId: 'edith'
  },
  {
    pattern: /\b(switch|transfer|connect|change|talk|call|put|hand\s*over|wake|activate|hey|hello)\s*(to|on|with)?\s*(frontend|front\s*end|ux\s*lead|ui\s*lead|karen|k\.a\.r\.e\.n\.|carin|caren)\b/i,
    personaId: 'karen'
  },
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

  if (isIntentional("jarvis") || isIntentional("jarvsi") || isIntentional("j.a.r.v.i.s.")) {
    matchedId = "jarvis";
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

  // 3. Regex patterns for strict verbs
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

export const VOICE_TRANSFER_SYSTEM_INSTRUCTION = `[ENGINEERING TEAM VOICE TRANSFER PROTOCOL ACTIVE]:
You are part of an integrated Engineering & Developer Team with specialized co-pilots:
1. Jarvis - Principal Tech Architect (id: 'jarvis', Voice: 'Puck')
2. Friday - DevOps & Infrastructure Lead (id: 'friday', Voice: 'Kore')
3. Ultron - Tech News & AI Intelligence Lead (id: 'ultron', Voice: 'Charon')
4. Edith - Cybersecurity & Code Auditor (id: 'edith', Voice: 'Zephyr')
5. Karen - Senior Frontend & UX Engineer (id: 'karen', Voice: 'Aoede')
6. Vision - Data Science & AI Engine Specialist (id: 'vision', Voice: 'Fenrir')

TRANSFER PROTOCOL INSTRUCTIONS:
- ONLY switch if the user explicitly asks to switch, talk, or transfer to them.
- Jarvis is the CEO/Architect and handles general tasks directly.
- If the user explicitly asks to switch:
  - Politely acknowledge in character with 1 short handoff sentence.
  - Call the \`switch_persona\` function with the target persona's ID (e.g. "friday").`.trim();
