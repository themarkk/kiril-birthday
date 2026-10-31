// Stato di gioco: flag, contatori, oggetti, parole di Marco, posizione. Salvataggio su localStorage.

export const SAVE_KEY = 'kiril-bday-v1';
const VERSION = 1;

export function createState() {
  return {
    version: VERSION,
    flags: new Set(),
    counters: {},
    items: new Set(),
    words: {},
    map: 'house',
    x: 0,
    y: 0,
    dir: 'down',
    person: 'kiril',
    playMs: 0,
  };
}

export function serialize(state) {
  return JSON.stringify({
    ...state,
    flags: [...state.flags],
    items: [...state.items],
  });
}

export function deserialize(str) {
  try {
    const raw = JSON.parse(str);
    if (!raw || raw.version !== VERSION) return null;
    const s = createState();
    return {
      ...s,
      ...raw,
      flags: new Set(raw.flags || []),
      items: new Set(raw.items || []),
      counters: { ...(raw.counters || {}) },
      words: { ...(raw.words || {}) },
    };
  } catch {
    return null;
  }
}

function defaultStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function save(state, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function load(storage = defaultStorage()) {
  try {
    if (!storage) return null;
    const raw = storage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function clearSave(storage = defaultStorage()) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* storage bloccato: niente da fare */ }
}
