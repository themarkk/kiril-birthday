// Aiuti di Bullone: la fase è la prima con condizione vera; il livello sale ogni volta che lo chiedi.

import { evaluate } from './conditions.js';

export function pickHint(phases, state) {
  const phaseIndex = (phases || []).findIndex(p => evaluate(p.if, state));
  if (phaseIndex === -1) return null;
  const lines = phases[phaseIndex].lines;
  const level = Math.min(state.counters[`hint_${phaseIndex}`] || 0, lines.length - 1);
  return { phaseIndex, level, line: lines[level] };
}
