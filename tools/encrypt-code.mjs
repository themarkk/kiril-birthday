// Cifra il link del regalo in data/secret.json. Il testo in chiaro non viene mai salvato.
// Uso: node tools/encrypt-code.mjs "<link>" [--words RISATA,BRONCIO,CORAGGIO] [--culprit davi]
// Senza --words, le parole vengono lette dagli effetti "word:" nei dialoghi.

import { readFile, writeFile } from 'node:fs/promises';
import { buildPassphrase, encryptText, decryptText } from '../src/game/crypto.js';

const root = new URL('..', import.meta.url);
const args = process.argv.slice(2);
const plain = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--words' && args[args.indexOf(a) - 1] !== '--culprit');
if (!plain) {
  console.error('Uso: node tools/encrypt-code.mjs "<link>" [--words A,B,C] [--culprit nome]');
  process.exit(1);
}
const opt = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const story = JSON.parse(await readFile(new URL('data/story.json', root), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('data/manifest.json', root), 'utf8'));

let words = {};
if (opt('words')) {
  const list = opt('words').split(',');
  story.words.forEach((k, i) => { words[k] = list[i]; });
} else {
  for (const d of manifest.dialogues) {
    const text = await readFile(new URL(`data/dialogues/${d}.json`, root), 'utf8');
    for (const m of text.matchAll(/"word:(\w+):([^"]+)"/g)) words[m[1]] = m[2];
  }
}
const missing = story.words.filter(k => !words[k]);
if (missing.length) {
  console.error(`Mancano le parole di: ${missing.join(', ')}`);
  process.exit(1);
}
const culprit = opt('culprit') || story.accusation.culprit;
const pass = buildPassphrase(words, culprit, story.words);
const blob = await encryptText(plain, pass);
if ((await decryptText(blob, pass)) !== plain) {
  console.error('Verifica fallita: non scrivo nulla.');
  process.exit(1);
}
await writeFile(new URL('data/secret.json', root), `${JSON.stringify(blob, null, 2)}\n`);
console.log(`ok — data/secret.json aggiornato (${plain.length} caratteri cifrati, parole: ${story.words.map(k => words[k]).join(' · ')}, colpevole: ${culprit})`);
