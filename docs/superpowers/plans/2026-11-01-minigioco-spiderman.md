# Minigioco di Spider-Man: piano di lavoro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere in casa una Switch che apre un platformer a ragnatele, giocabile con Spider-Man o con Kiril, senza effetti sulla storia.

**Architecture:** Fisica pura in `src/puzzles/swing.js`, schermate in `data/swing.json`, disegno e tasti in `src/puzzles/swing-scene.js`. La scena si apre dal nodo `puzzle` di un dialogo, come gli altri minigiochi.

**Tech Stack:** JS puro (moduli ES), canvas 256x192, overlay DOM `#ui`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-01-minigioco-spiderman-design.md`

## Global Constraints
- Solo aggiunte: nessun testo, tile, oggetto o comportamento esistente cambia. In particolare il nodo `tv` di `objects.json` resta com'è.
- Nessun flag, oggetto, contatore o scrittura nuova nel salvataggio.
- Sprite disegnati da noi come griglie di caratteri: nessuna immagine presa da giochi esistenti.
- Solo tastiera, con le azioni di `Input`: `left`, `right`, `up`, `ok`, `back`.
- Battute scritte da noi, brevi, in italiano. Kiril al maschile; niente "amore" né "ti amo".
- Niente vite, timer o game over: chi cade o viene colpito riparte dall'inizio della schermata.
- Commit solo in locale. Il push pubblica il sito: si fa solo quando Marco lo chiede.
- Ogni messaggio di commit finisce con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Z ancora premuto quando parte la partita: la ragnatela non deve attaccarsi da sola (Task 3, prova nel browser).
2. Una schermata impossibile da superare: ogni schermata deve essere finibile (Task 2, test con giocatore automatico).
3. Frame lenti o scheda in sottofondo: il personaggio non deve attraversare i tetti (Task 1 e 2, passo fisso e tetti alti almeno 8 px).
4. Uscita con X da selezione o partita: si torna in casa con musica e dialogo a posto, una volta sola (Task 3, prova nel browser).
5. Salvataggio con Kiril proprio in (10,4), dove ora c'è la Switch: deve potersi spostare (Task 4, prova nel browser).

---

### Task 1: Fisica pura

**Files:**
- Create: `src/puzzles/swing.js`
- Test: `tests/swing.test.mjs`

**Interfaces:**
- Produces:
  - `STEP = 1 / 60`
  - `createSwing(screen)` → `{ x, y, vx, vy, onGround, rope, t, facing }`. `x,y` sono il centro dei piedi, presi da `screen.start`. `rope` è `null` o `{ x, y, len }`. `facing` è `1` o `-1`.
  - `stepSwing(s, screen, keys)` avanza di un `STEP` e restituisce `null | 'fall' | 'hit' | 'exit'`. `keys` è `{ left, right, jump, web }`.
  - `pickAnchor(anchors, x, y)` → ancora o `null`.
  - `bombPos(bomb, t)` → `{ x, y }`.
  - Una schermata è `{ start: {x, y}, roofs: [{x, y, w, h}], anchors: [{x, y}], bombs: [{x, y, ax, ay, period}] }`. `roofs`, `anchors` e `bombs` possono mancare.

- [ ] **Step 1: Scrivere i test che falliscono**

Usare un tetto `floor = { x: 0, y: 100, w: 256, h: 92 }` e queste verifiche:

```js
test('lands on a roof', () => {
  const sc = { start: { x: 50, y: 50 }, roofs: [floor] };
  const s = createSwing(sc);
  for (let i = 0; i < 120; i++) stepSwing(s, sc, {});
  assert.equal(s.y, 100); assert.equal(s.vy, 0); assert.equal(s.onGround, true);
});
test('falling off the screen returns fall', () => {
  const sc = { start: { x: 50, y: 50 } };
  const s = createSwing(sc);
  const r = Array.from({ length: 120 }, () => stepSwing(s, sc, {}));
  assert.ok(r.includes('fall'));
});
test('the right edge returns exit, the left edge blocks', () => {
  const sc = { start: { x: 250, y: 100 }, roofs: [floor] };
  const s = createSwing(sc);
  const r = Array.from({ length: 60 }, () => stepSwing(s, sc, { right: true }));
  assert.ok(r.includes('exit'));
  const l = createSwing({ start: { x: 8, y: 100 }, roofs: [floor] });
  for (let i = 0; i < 60; i++) stepSwing(l, { roofs: [floor] }, { left: true });
  assert.ok(l.x >= 5);
});
test('a wall stops the player', () => {
  const sc = { start: { x: 50, y: 100 }, roofs: [floor, { x: 100, y: 0, w: 20, h: 100 }] };
  const s = createSwing(sc);
  for (let i = 0; i < 120; i++) stepSwing(s, sc, { right: true });
  assert.ok(s.x <= 95);
});
test('jump works only from the ground', () => {
  const sc = { start: { x: 50, y: 100 }, roofs: [floor] };
  const s = createSwing(sc);
  stepSwing(s, sc, {}); stepSwing(s, sc, { jump: true });
  assert.ok(s.vy < 0);
  const before = s.vy;
  stepSwing(s, sc, { jump: true });
  assert.ok(s.vy > before);
});
test('pickAnchor prefers ahead, ignores far and below', () => {
  assert.equal(pickAnchor([{ x: 40, y: 40 }, { x: 80, y: 40 }], 60, 100).x, 80);
  assert.equal(pickAnchor([{ x: 300, y: 40 }], 60, 100), null);
  assert.equal(pickAnchor([{ x: 60, y: 120 }], 60, 100), null);
});
test('the rope keeps its length and gives momentum', () => {
  const sc = { start: { x: 40, y: 80 }, anchors: [{ x: 90, y: 30 }] };
  const s = createSwing(sc);
  let maxVx = 0;
  for (let i = 0; i < 30; i++) {
    stepSwing(s, sc, { web: true });
    assert.ok(Math.hypot(s.x - s.rope.x, s.y - s.rope.y) <= s.rope.len + 0.5);
    maxVx = Math.max(maxVx, s.vx);
  }
  assert.ok(maxVx > 50);
  stepSwing(s, sc, {});
  assert.equal(s.rope, null);
});
test('touching a bomb returns hit', () => {
  const sc = { start: { x: 50, y: 100 }, roofs: [floor], bombs: [{ x: 50, y: 90, ax: 0, ay: 0, period: 2 }] };
  assert.equal(stepSwing(createSwing(sc), sc, {}), 'hit');
});
test('bombPos follows a sine', () => {
  const b = { x: 100, y: 50, ax: 20, ay: 0, period: 2 };
  assert.equal(bombPos(b, 0).x, 100);
  assert.ok(Math.abs(bombPos(b, 0.5).x - 120) < 1e-9);
});
```

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `node --test tests/swing.test.mjs`
Expected: FAIL, modulo `swing.js` non trovato.

- [ ] **Step 3: Scrivere `src/puzzles/swing.js`**

Valori di partenza, come costanti in testa al file: gravità 420 px/s², camminata 70 px/s, salto 170 px/s, accelerazione in aria 120 px/s², spinta in corda 160 px/s² lungo la tangente, portata corda 110 px, velocità massima 260 px/s, corpo 10x22 px, raggio bomba 5 px.

`pickAnchor` considera le ancore entro la portata e con `a.y < y - 8`, e sceglie il valore minimo di `distanza - 0.5 * (a.x - x)`.

Ordine di un passo:
1. Con `web` attivo e senza corda, attaccare `pickAnchor` con `len` pari alla distanza attuale, minimo 24. Con `web` spento, togliere la corda.
2. Applicare tasti e gravità.
3. Muovere e correggere le collisioni con i tetti, prima in x e poi in y.
4. Se la corda è tesa, riportare il punto sul cerchio e togliere la velocità radiale. In corda valgono le collisioni normali.

Dopo il passo: `x > 256` → `'exit'`; `y > 216` → `'fall'`; contatto con una bomba → `'hit'`. A sinistra `x` non scende sotto 5. In alto non c'è limite.

- [ ] **Step 4: Lanciare i test e vederli passare**

Run: `node --test tests/swing.test.mjs`
Expected: tutti PASS.

- [ ] **Step 5: Commit**

```bash
git add src/puzzles/swing.js tests/swing.test.mjs
git commit -m "feat: fisica del minigioco a ragnatele"
```

### Task 2: Le cinque schermate

**Files:**
- Create: `data/swing.json`
- Modify: `data/manifest.json` (aggiungere `"swing"` a `other`)
- Test: `tests/swing.test.mjs`

**Interfaces:**
- Consumes: `createSwing`, `stepSwing`, `pickAnchor`, `bombPos` dal Task 1.
- Produces: `game.data.swing`, con questa forma:
  - `screens`: 5 schermate del Task 1, ognuna con `say` (battuta di apertura).
  - `heroes`: `{ spiderman: {...}, kiril: {...} }`, ognuno con `name`, `pitch` (testo nella selezione), `fall` (elenco di battute), `headline` e `article` (Daily Bugle).

- [ ] **Step 1: Scrivere i test che falliscono**

```js
const data = JSON.parse(readFileSync('data/swing.json', 'utf8'));
test('five screens, roofs thick enough, both heroes complete', () => {
  assert.equal(data.screens.length, 5);
  for (const sc of data.screens) {
    assert.ok(sc.say);
    for (const r of sc.roofs || []) assert.ok(r.h >= 8);
  }
  assert.ok(data.screens[3].bombs?.length && data.screens[4].bombs?.length);
  for (const h of ['spiderman', 'kiril']) {
    for (const k of ['name', 'pitch', 'headline', 'article']) assert.ok(data.heroes[h][k]);
    assert.ok(data.heroes[h].fall.length >= 3);
  }
});
test('a simple bot can finish every screen', () => {
  data.screens.forEach((sc, i) => assert.ok(canFinish(sc), `schermata ${i + 1}`));
});
```

`canFinish(sc)` sta nel test e prova attese iniziali da 0 a 3 s, a passi di 0,25 s, con un massimo di 40 s simulati per tentativo. Il giocatore automatico tiene `right` e tiene `web` finché non ha superato l'ancora di almeno 30% della lunghezza della corda mentre sta risalendo. Rilascia e riattacca alla prossima ancora davanti. Salta da fermo quando un muro lo blocca. Il tentativo riesce con `'exit'`, fallisce con `'fall'` o `'hit'`.

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `node --test tests/swing.test.mjs`
Expected: FAIL, `data/swing.json` non trovato.

- [ ] **Step 3: Scrivere `data/swing.json` e aggiungerlo al manifest**

Progressione dallo spec: 1) tetti vicini per imparare, 2) vuoto largo, 3) muro alto da scavalcare, 4) bombe zucca di Goblin in movimento, 5) schermata finale che unisce tutto. I riferimenti (zia May, zio Ben, Goblin, Jameson) stanno in `say`, `pitch`, `fall`, `headline` e `article`. `headline` e `article` sono diversi per Spider-Man e per Kiril.

- [ ] **Step 4: Lanciare i test e il validatore**

Run: `npm test && npm run validate`
Expected: tutti PASS e 0 errori. Se una schermata non è finibile, correggere la schermata, non il giocatore automatico.

- [ ] **Step 5: Commit**

```bash
git add data/swing.json data/manifest.json tests/swing.test.mjs
git commit -m "feat: schermate e testi del minigioco a ragnatele"
```

### Task 3: Scena, sprite e stile

**Files:**
- Create: `src/puzzles/swing-scene.js`
- Modify: `src/puzzles/puzzle-scenes.js` (una riga di import e una in `registerPuzzles`), `data/art/characters.json` (persona `spiderman`, extra `spiderman_suit`), `data/art/objects.json` (`swing_anchor`, `swing_bomb`), `style.css` (classi `.swing-*`)
- Test: `tests/swing.test.mjs`

**Interfaces:**
- Consumes: `STEP`, `createSwing`, `stepSwing`, `pickAnchor`, `bombPos` dal Task 1; `game.data.swing` dal Task 2; `el` da `src/game/dialogue-scene.js`.
- Produces: `new SwingScene(game, onResult)` e `game.puzzles.swing`. `onResult(true)` dopo il Daily Bugle, `onResult(false)` con X. `debugSolve(win)` come in `PuzzleScene`.

- [ ] **Step 1: Scrivere il test che fallisce**

In `tests/swing.test.mjs`, importando `composePixels` da `../src/engine/art.js` (`tests/art.test.mjs` usa dati finti, qui servono quelli veri):

```js
const chars = JSON.parse(readFileSync('data/art/characters.json', 'utf8'));
test('spiderman has a full mask, no hair, and all directions', () => {
  assert.equal(chars.people.spiderman.hairStyle, 'none');
  assert.ok(chars.people.spiderman.extras.includes('spiderman_suit'));
  for (const dir of ['down', 'up', 'left', 'right']) {
    assert.equal(composePixels(chars, 'spiderman', dir, 0).h, 24);
  }
});
```

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `node --test tests/swing.test.mjs`
Expected: FAIL, `chars.people.spiderman` non esiste.

- [ ] **Step 3: Aggiungere gli sprite**

`spiderman` usa base `normal`, `hairStyle: "none"`, pelle rossa, maglia e scarpe rosse, pantaloni blu. L'extra `spiderman_suit` è nuovo: ragnatele scure, occhi bianchi e ragno sul petto. Il costume di Erika non si tocca. `swing_anchor` è circa 8x8, `swing_bomb` circa 10x10 con faccia da zucca.

- [ ] **Step 4: Lanciare il test e vederlo passare**

Run: `node --test tests/swing.test.mjs`
Expected: tutti PASS.

- [ ] **Step 5: Scrivere `SwingScene` in `src/puzzles/swing-scene.js`**

- `overlay = false`, così la casa non si vede sotto.
- `enter`: suona `arcade`. `exit`: toglie gli elementi DOM e suona `game.world.map.json.music`.
- Fasi `select` → `play` → `bugle`. Il testo è DOM in `game.ui`, il mondo è su canvas.
- `select`: titolo e i due personaggi. ←→ sceglie, Z conferma, X `finish(false)`.
- `play`: accumula `Math.min(dt, 0.05)` e fa `stepSwing` a passo `STEP`, leggendo `input.held` per `left`, `right`, `up` (salto) e `ok` (ragnatela). X `finish(false)`.
  - Con `'fall'` o `'hit'`: suono `wrong`, battuta successiva da `fall`, stessa schermata da capo.
  - Con `'exit'`: schermata successiva con suono `select`; dopo l'ultima, suono `solve` e fase `bugle`.
- `bugle`: prima pagina con `headline` e `article`. Z `finish(true)`.
- Disegno: cielo e palazzi di sfondo in un canvas preparato una volta; tetti a rettangoli; ancora evidenziata con `pickAnchor` quando non c'è corda; corda disegnata a pixel con `fillRect`, senza linee sfumate; sprite da `art.person(id)`, frame `right` o `left` secondo `facing`.
- `finish(win)` scatta una volta sola, come in `PuzzleScene`.

- [ ] **Step 6: Registrare la scena e provarla nel browser**

Run: `node tools/serve.mjs 8080`, poi aprire http://localhost:8080/?debug=1 e, dalla console, spingere la scena con `__game.scenes.push(__game.puzzles.swing(__game, () => {}))`.
Expected: entrambi i personaggi giocabili, nessun errore in console. Con Z già premuto all'avvio la ragnatela non parte da sola. Con X in selezione e in partita la scena si chiude una volta sola e torna la musica della casa.

- [ ] **Step 7: Commit**

```bash
git add src/puzzles/swing-scene.js src/puzzles/puzzle-scenes.js data/art/characters.json data/art/objects.json style.css tests/swing.test.mjs
git commit -m "feat: scena del minigioco a ragnatele con Spider-Man e Kiril"
```

### Task 4: La Switch in casa

**Files:**
- Modify: `data/art/tiles.json` (tile `switch`), `data/maps/house.json`, `data/dialogues/objects.json`, `CLAUDE.md`
- Test: `tests/swing.test.mjs`

**Interfaces:**
- Consumes: `game.puzzles.swing` dal Task 3.
- Produces: nodi `switch`, `switch_win`, `switch_lose` in `objects.json`.

- [ ] **Step 1: Scrivere il test che fallisce**

```js
test('the Switch sits under the TV and leaves the TV reachable', () => {
  const house = JSON.parse(readFileSync('data/maps/house.json', 'utf8'));
  assert.equal([...house.rows[4]][10], 'n');
  assert.equal(house.legend.n, 'switch');
  assert.equal([...house.rows[3]][10], '.');
  const sw = house.objects.find(o => o.id === 'switch');
  assert.deepEqual([sw.x, sw.y, sw.node], [10, 4, 'switch']);
  const objects = JSON.parse(readFileSync('data/dialogues/objects.json', 'utf8'));
  assert.equal(objects.nodes.switch.puzzle.id, 'swing');
  assert.equal(objects.nodes.tv.lines[0], 'La TV è spenta. Strano: Marco la lascia sempre accesa sui documentari di ingegneria.');
});
```

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `node --test tests/swing.test.mjs`
Expected: FAIL, in (10,4) c'è ancora `.`.

- [ ] **Step 3: Aggiungere tile, mappa e dialogo**

- Tile `switch`: `solid: true`, 16x16, base in legno come `tv`, con console sul dock e controller rosso e blu.
- `house.json`: riga 4 → `..TT.c....n`, legenda `"n": "switch"`, oggetto `{ "id": "switch", "x": 10, "y": 4, "dialogue": "objects", "node": "switch" }`.
- `objects.json`: `switch` ha una riga e `puzzle: { "id": "swing", "win": "switch_win", "lose": "switch_lose" }`; `switch_win` e `switch_lose` hanno una battuta ciascuno.

- [ ] **Step 4: Aggiornare `CLAUDE.md`**

Alla regola sui personaggi protetti aggiungere l'eccezione voluta da Marco: Spider-Man e Switch veri nel solo minigioco. In "Decisioni importanti" aggiungere una riga sul minigioco: file, solo sfizio, nessun effetto sulla storia. Il file resta sotto le 70 righe.

- [ ] **Step 5: Lanciare test e validatore**

Run: `npm test && npm run validate`
Expected: tutti PASS e 0 errori.

- [ ] **Step 6: Provare tutto nel browser**

Su http://localhost:8080/?debug=1:
- Dalla Switch fino al Daily Bugle e ritorno, con entrambi i personaggi, finendo ogni schermata a mano.
- La TV si usa ancora da (10,3) e dà il testo di sempre.
- Con Kiril portato in (10,4) da console e salvataggio ricaricato, si sposta normalmente.

Expected: nessun errore in console e nessun flag nuovo in `__game.state.flags` dopo la partita.

- [ ] **Step 7: Commit**

```bash
git add data/art/tiles.json data/maps/house.json data/dialogues/objects.json tests/swing.test.mjs CLAUDE.md docs/superpowers/specs/2026-11-01-minigioco-spiderman-design.md docs/superpowers/plans/2026-11-01-minigioco-spiderman.md
git commit -m "feat: Switch in casa che apre il minigioco a ragnatele"
```
