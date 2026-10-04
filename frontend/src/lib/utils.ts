import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toPlainText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\*\*([^\*]+)\*\*/g, '$1')
    .replace(/^-\s+/gm, '')
    .trim();
}

export async function fetchRegisteredAgents() {
  try {
    const res = await fetch('/api/a2a/agents');
    if (res.ok) {
      const data = await res.json();
      return data.agents || [];
    }
  } catch (_) {}
  return [];
}


