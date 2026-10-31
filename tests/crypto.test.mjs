import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPassphrase, encryptText, decryptText } from '../src/game/crypto.js';

test('roundtrip with the right passphrase', async () => {
  const blob = await encryptText('https://example.test/x', 'a|b|c|davi', 1000);
  assert.equal(blob.v, 1);
  assert.equal(blob.iter, 1000);
  assert.equal(await decryptText(blob, 'a|b|c|davi'), 'https://example.test/x');
});

test('wrong passphrase returns null', async () => {
  const blob = await encryptText('segreto', 'a|b|c|davi', 1000);
  assert.equal(await decryptText(blob, 'a|b|c|masia'), null);
});

test('malformed blob returns null', async () => {
  assert.equal(await decryptText({}, 'x'), null);
  assert.equal(await decryptText(null, 'x'), null);
});

test('passphrase normalizes case and spaces in story order', () => {
  assert.equal(
    buildPassphrase({ nicole: ' RISATA', leryn: 'Broncio', elisa: 'coraggio' }, 'Davi'),
    'risata|broncio|coraggio|davi',
  );
});

test('missing word still builds a (wrong) passphrase', () => {
  assert.equal(buildPassphrase({ nicole: 'risata' }, 'davi'), 'risata|||davi');
});
