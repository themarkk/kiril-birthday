// Logica del tribunale finale: colpevole giusto + abbastanza prove valide (diverse tra loro).

export function judgeAccusation(suspect, evidenceIds, rules) {
  if (suspect !== rules.culprit) return 'wrong_suspect';
  const valid = new Set((evidenceIds || []).filter(id => rules.validEvidence.includes(id)));
  return valid.size >= rules.need ? 'correct' : 'weak_evidence';
}
