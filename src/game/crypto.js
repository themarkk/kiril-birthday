// Il link del regalo è cifrato: si apre solo con le tre Parole-Chiave di Marco + il nome del colpevole.
// Funziona uguale nel browser e in Node (globalThis.crypto.subtle).

const WORD_ORDER = ['nicole', 'leryn', 'elisa'];
const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = buf => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));

export function buildPassphrase(words, culprit, order = WORD_ORDER) {
  const norm = v => String(v ?? '').trim().toLowerCase();
  return [...order.map(k => norm(words?.[k])), norm(culprit)].join('|');
}

async function deriveKey(passphrase, salt, iter) {
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plain, passphrase, iter = 150000) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iter);
  const ct = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return { v: 1, iter, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptText(blob, passphrase) {
  try {
    if (!blob?.ct) return null;
    const key = await deriveKey(passphrase, fromB64(blob.salt), blob.iter);
    const pt = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.ct));
    return dec.decode(pt);
  } catch {
    return null;
  }
}
