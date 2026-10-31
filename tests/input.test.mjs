import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/engine/input.js';

function key(target, type, code, repeat = false) {
  const e = new Event(type, { cancelable: true });
  e.code = code;
  e.repeat = repeat;
  target.dispatchEvent(e);
  return e;
}

test('pressed is true for exactly one frame, held while down', () => {
  const t = new EventTarget();
  const inp = new Input(t);
  key(t, 'keydown', 'ArrowUp');
  assert.equal(inp.pressed('up'), true);
  assert.equal(inp.held('up'), true);
  inp.endFrame();
  assert.equal(inp.pressed('up'), false);
  assert.equal(inp.held('up'), true);
  key(t, 'keyup', 'ArrowUp');
  assert.equal(inp.held('up'), false);
});

test('Z, Enter and Space all map to ok', () => {
  for (const code of ['KeyZ', 'Enter', 'Space']) {
    const t = new EventTarget();
    const inp = new Input(t);
    key(t, 'keydown', code);
    assert.equal(inp.pressed('ok'), true, code);
  }
});

test('auto-repeat keydown does not re-trigger pressed', () => {
  const t = new EventTarget();
  const inp = new Input(t);
  key(t, 'keydown', 'KeyZ');
  inp.endFrame();
  key(t, 'keydown', 'KeyZ', true);
  assert.equal(inp.pressed('ok'), false);
});

test('consume blocks a held key until it is released and pressed again', () => {
  const t = new EventTarget();
  const inp = new Input(t);
  key(t, 'keydown', 'KeyZ');
  inp.consume();
  assert.equal(inp.pressed('ok'), false);
  assert.equal(inp.held('ok'), false);
  key(t, 'keydown', 'KeyZ', true);
  assert.equal(inp.pressed('ok'), false);
  key(t, 'keyup', 'KeyZ');
  key(t, 'keydown', 'KeyZ');
  assert.equal(inp.pressed('ok'), true);
});

test('arrow keys and space have default prevented', () => {
  const t = new EventTarget();
  new Input(t);
  assert.equal(key(t, 'keydown', 'ArrowDown').defaultPrevented, true);
  assert.equal(key(t, 'keydown', 'Space').defaultPrevented, true);
});
