// Condizioni ("a & !b", "ducks>=7", "has.d20") ed effetti ("set:x", "give:k") usati dai JSON.

const TOKEN = /\s*(>=|<=|==|!=|[()!&|<>]|[A-Za-z_][\w.]*|-?\d+)/y;

function tokenize(expr) {
  const out = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < expr.length) {
    if (/^\s*$/.test(expr.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(expr);
    if (!m) throw new Error(`token non valido in "${expr}" alla posizione ${pos}`);
    out.push(m[1]);
    pos = TOKEN.lastIndex;
  }
  return out;
}

function valueOf(name, state) {
  if (name.startsWith('has.')) return state.items.has(name.slice(4)) ? 1 : 0;
  if (/^-?\d+$/.test(name)) return Number(name);
  if (name in state.counters) return state.counters[name];
  return state.flags.has(name) ? 1 : 0;
}

// Parser a discesa ricorsiva: or → and → not → comparison → atom
export function parse(expr) {
  const toks = tokenize(expr);
  let i = 0;
  const peek = () => toks[i];
  const eat = t => {
    if (toks[i] !== t) throw new Error(`atteso "${t}" in "${expr}"`);
    i++;
  };
  function atom() {
    const t = toks[i++];
    if (t === undefined) throw new Error(`espressione incompleta: "${expr}"`);
    if (t === '(') { const n = or(); eat(')'); return n; }
    if (/^[A-Za-z_\d-]/.test(t)) return { k: 'id', name: t };
    throw new Error(`simbolo inatteso "${t}" in "${expr}"`);
  }
  function cmp() {
    const left = atom();
    if (['>=', '<=', '==', '!=', '<', '>'].includes(peek())) {
      const op = toks[i++];
      const right = atom();
      return { k: 'cmp', op, left, right };
    }
    return left;
  }
  function not() {
    if (peek() === '!') { i++; return { k: 'not', a: not() }; }
    return cmp();
  }
  function and() {
    let n = not();
    while (peek() === '&') { i++; n = { k: 'and', a: n, b: not() }; }
    return n;
  }
  function or() {
    let n = and();
    while (peek() === '|') { i++; n = { k: 'or', a: n, b: and() }; }
    return n;
  }
  const tree = or();
  if (i !== toks.length) throw new Error(`simboli in più in "${expr}"`);
  return tree;
}

function run(n, state) {
  switch (n.k) {
    case 'id': return valueOf(n.name, state);
    case 'not': return run(n.a, state) ? 0 : 1;
    case 'and': return run(n.a, state) && run(n.b, state) ? 1 : 0;
    case 'or': return run(n.a, state) || run(n.b, state) ? 1 : 0;
    case 'cmp': {
      const a = run(n.left, state), b = run(n.right, state);
      switch (n.op) {
        case '>=': return a >= b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '==': return a === b ? 1 : 0;
        case '!=': return a !== b ? 1 : 0;
        case '<': return a < b ? 1 : 0;
        case '>': return a > b ? 1 : 0;
      }
    }
  }
  return 0;
}

const cache = new Map();

export function evaluate(expr, state) {
  if (expr === undefined || expr === null || String(expr).trim() === '') return true;
  let tree = cache.get(expr);
  if (tree === undefined) {
    try { tree = parse(String(expr)); } catch (e) { tree = null; console.warn('[condizione]', e.message); }
    cache.set(expr, tree);
  }
  return tree ? Boolean(run(tree, state)) : false;
}

export function applyEffects(effects, state, hooks = {}) {
  if (!effects) return;
  for (const eff of effects) {
    const [verb, ...args] = String(eff).split(':');
    switch (verb) {
      case 'set': state.flags.add(args[0]); break;
      case 'unset': state.flags.delete(args[0]); break;
      case 'inc': state.counters[args[0]] = (state.counters[args[0]] || 0) + 1; break;
      case 'dec': state.counters[args[0]] = Math.max(0, (state.counters[args[0]] || 0) - 1); break;
      case 'give':
        if (!state.items.has(args[0])) { state.items.add(args[0]); hooks.gave?.(args); }
        break;
      case 'take': state.items.delete(args[0]); break;
      case 'word': state.words[args[0]] = args.slice(1).join(':'); break;
      default:
        if (hooks[verb]) hooks[verb](args);
        else console.warn(`[effetto] verbo senza gestore: ${eff}`);
    }
  }
}
