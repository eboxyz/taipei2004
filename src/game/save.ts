import { migrate } from './state';
import { retireAutoSquad } from './turf';
import type { GameState } from './types';

export const SAVE_KEY = 'taipei2004.save';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string, now: number): GameState | null {
  try {
    const s = migrate(JSON.parse(json), now);
    return s && retireAutoSquad(s);
  } catch {
    return null;
  }
}

/** Export string: base64 of the JSON, safe for copy/paste. */
export function exportSave(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(text: string, now: number): GameState | null {
  try {
    const bin = atob(text.trim());
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes), now);
  } catch {
    return null;
  }
}

export function loadLocal(now: number): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(raw, now) : null;
  } catch {
    return null;
  }
}

export function saveLocal(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function clearLocal(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}
