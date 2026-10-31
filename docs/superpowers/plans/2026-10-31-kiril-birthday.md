# Il Compleanno di Kiril — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un gioco giallo pixel art top-down a griglia, giocabile nel browser da PC, ~1 ora, che si conclude con gli auguri a Kiril e il link-premio decifrato.

**Architecture:** ES modules nel browser senza build. Il canvas 256×192 (scala intera, pixel-perfect) disegna il mondo. L'interfaccia (dialoghi, menu, taccuino, finale) è un overlay DOM sopra il canvas, scalato insieme, per avere testo italiano nitido e leggibile. Tutto il contenuto (mappe, tile, sprite, dialoghi, storia, finale) sta in `data/**/*.json`. La logica pura (condizioni, stato, dialoghi, enigmi, crypto) non tocca il DOM ed è testata con `node:test`.

**Tech Stack:** HTML5 Canvas 2D, JavaScript ES2022 modules, WebCrypto (PBKDF2 + AES-GCM), WebAudio, Google Fonts (`Pixelify Sans` per il testo, `Press Start 2P` per i titoli, fallback `monospace`), Node 22 (`node --test`, script di tool), `python3 -m http.server` per lo sviluppo locale, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-31-kiril-birthday-design.md`

## Global Constraints

- Zero dipendenze npm. Niente bundler. Il `package.json` serve solo per `"type":"module"` e per gli script.
- Solo URL relativi (`./data/...`): il sito gira sotto `https://themarkk.github.io/kiril-birthday/`.
- Risoluzione interna 256×192, tile 16×16, vista 16×12 tile; scala = `max(1, floor(min(innerWidth/256, innerHeight/192)))`, `image-rendering: pixelated`.
- Comandi: frecce/WASD per muoversi, Shift per correre, Z/Invio/Spazio = conferma/interagisci, X/Esc/Backspace = annulla, I = Taccuino, H = Bullone (aiuti). Su frecce e spazio va `preventDefault`.
- Il link-premio non compare mai in chiaro in nessun file del repo. Esiste solo cifrato in `data/secret.json`. Passphrase = `risata|broncio|coraggio|davi` (parole minuscole unite da `|`, nell'ordine nicole, leryn, elisa, poi il colpevole). PBKDF2-SHA256 con 150000 iterazioni e AES-GCM 256.
- Le 3 Parole-Chiave di Marco: Nicole → `RISATA`, Leryn → `BRONCIO`, Elisa → `CORAGGIO` ("Tre cose che amo di te").
- Colpevole `davi`. Sospettati `masia`, `bea`, `davi`.
- Generi: Maki e Bea al neutro; Masia, Leryn e Davi al maschile; Moka, Erika, Elisa, Nicole e Martina al femminile.
- Nessun personaggio, logo o grafica Marvel/Nintendo/Pokémon: solo omaggi originali (costume "ragno" nostro, robot di Marco, spada nel carciofo).
- Chiave di salvataggio `localStorage`: `kiril-bday-v1`. Ogni accesso dentro try/catch: il gioco deve funzionare anche senza storage.
- Il gioco non può mai bloccarsi senza via d'uscita: ogni enigma ha un reset e un aiuto di Bullone; dopo 2 sconfitte la minigame offre una via comica per proseguire.
- Commit a ogni tappa funzionante, con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Orario: adesso sono le 17:17 del 31/10. Tappa 3 online entro le ~21:00, Tappa 4 entro le ~23:30, Tappe 5–7 entro le ~04:30, Tappe 8–9 entro le ~07:00.

## Review Focus

1. **Tasti tenuti premuti alla chiusura di un dialogo:** chiudere un dialogo con Z non deve riaprirlo subito, e chi tiene premuta una freccia non deve "saltare" le scelte. L'input è a fronte (pressed una sola volta per pressione) e viene consumato a ogni cambio di scena. *Test in Task 3 (`input consume`).*
2. **Ricaricare la pagina a metà gioco:** si salva solo in punti stabili (fine dialogo, cambio mappa, fine enigma) e al caricamento si riparte nel mondo con flag coerenti. Uno storage corrotto o mancante porta a una nuova partita, mai a un crash. *Test in Task 2 (`load corrupted`).*
3. **Puzzle a spinta senza uscita:** un carciofo spinto in un angolo deve sempre potersi resettare, uscendo dalla stanza o parlando con Elisa. *Test in Task 8 (`sokoban reset`).*
4. **Finestra piccola o ridimensionata (laptop 1366×768) e apertura via `file://`:** la scala non scende mai sotto 1 e l'overlay resta allineato al canvas. Se il `fetch` fallisce compare un messaggio chiaro in pagina, non uno schermo nero. *Test manuale in Task 3, test di `loadAll` in Task 3.*
5. **Contenuto modificato da Marco via prompt (JSON rotto, goto inesistente, flag scritto male):** il validatore lo segnala con file e chiave precisi, e in gioco un nodo mancante chiude il dialogo con un avviso in console invece di crashare. *Test in Task 5 (`validator`) e Task 4 (`missing node`).*

---

## File Structure

```
index.html                     canvas#screen + div#ui + link font + <script type=module src=src/main.js>
style.css                      layout, overlay, box dialoghi, menu, taccuino, finale
package.json                   {"type":"module","scripts":{"test":"node --test tests/","validate":"node tools/validate-data.mjs"}}
.claude/launch.json            config "game": python3 -m http.server 8080
README.md                      come giocare, come modificare i JSON, come ricifrare il premio
src/main.js                    boot: loadAll → art cache → SceneManager → loop rAF
src/engine/loader.js           loadAll(manifest) → oggetto dati; errore → messaggio DOM
src/engine/input.js            Input (held/pressed/consume)
src/engine/screen.js           canvas + scaling + overlay sync
src/engine/scenes.js           SceneManager (push/pop/replace, top riceve input)
src/engine/art.js              compilazione sprite: griglie di caratteri → canvas; composer personaggi/ritratti
src/engine/audio.js            WebAudio: blip, jingle, musica da data/music.json
src/world/tilemap.js           parse mappe (righe + legenda), solidità, warp, trigger
src/world/entity.js            movimento a griglia interpolato, direzione, frame camminata
src/world/world-scene.js       mondo: player, NPC, oggetti, pushable, camera, interazione, transizioni
src/game/conditions.js         evaluate(expr,state), applyEffects(list,state,hooks)
src/game/state.js              createState, save, load, oggetti/prove/parole/contatori
src/game/dialogue-runner.js    runner puro dei dialoghi
src/game/dialogue-scene.js     UI DOM del dialogo (typewriter, ritratto, scelte)
src/game/notebook-scene.js     Taccuino (prove, oggetti, parole, paperelle)
src/game/hints.js              selezione aiuto di Bullone per fase e livello
src/game/crypto.js             buildPassphrase, encryptText, decryptText (browser + node)
src/game/title-scene.js        titolo, "Nuova partita / Continua"
src/game/ending-scene.js       festa, auguri, decifratura e link-premio
src/game/debug.js              ?debug=1: pannello, window.dbg
src/puzzles/cipher.js + cipher-scene.js       statue di Nicole
src/puzzles/rps.js + rps-scene.js             morra di Masia
src/puzzles/combo.js + combo-scene.js         picchiaduro di Leryn
src/puzzles/sokoban.js                        logica di spinta (usata da world-scene)
src/puzzles/accusation.js + accusation-scene.js  tribunale finale
data/manifest.json             elenco di tutti i file dati da caricare
data/story.json                items, flags noti, hints per fase, regole accusa, finali
data/ending.json               testi festa/auguri per finale (voce di Marco, da ritoccare)
data/secret.json               {v,iter,salt,iv,ct} (base64)
data/music.json                tracce chiptune
data/art/tiles.json            tile del paese e degli interni
data/art/characters.json       corpi base, capigliature, extra, persone
data/art/portraits.json        ritratti composti
data/art/objects.json          oggetti (paperella, D20, buste, carciofo gigante, cassa…)
data/maps/town.json + house.json library.json arcade.json lab.json atelier.json tavern.json nuraghe.json
data/dialogues/<id>.json       uno per personaggio + objects.json + marco.json + bullone.json
tools/encrypt-code.mjs         node tools/encrypt-code.mjs "<link>" → data/secret.json
tools/validate-data.mjs        validatore contenuti
tests/*.test.mjs               conditions, state, dialogue, crypto, puzzles, validator
```

### Formati dati (decisi qui, usati da tutte le task)

**Immagine pixel** (in tutti i file art): `{"w":16,"h":16,"pal":{"a":"#2d1b10",...},"px":["....aaaa....", ...]}`. `.` è trasparente. Ogni riga è lunga `w`, e ci sono `h` righe.

**Tile** (`tiles.json`): `{"tiles":{"grass":{"solid":false,"img":<immagine>,"over":false}, "tree":{"solid":true,...}}}`. Con `over:true` il tile si disegna sopra il giocatore (chiome, tetti).

**Personaggi** (`characters.json`):
```
{"bases":{"normal":{"w":16,"h":24,"frames":{"down":[px,px,px],"up":[...],"left":[...]}},
          "tall":{"w":16,"h":32,"frames":{...}}},
 "hair":{"fringe":{"normal":{"down":[px],"up":[px],"left":[px]},"tall":{...}}, ...},
 "extras":{"glasses":{...stessa forma...},"beard_long":{...},"earring_l":{...},"piercings":{...},"chain":{...},"cape":{...}},
 "people":{"kiril":{"base":"normal","skin":"#e9b99a","skinShade":"#c98f72","hair":"#3a2318","hairStyle":"fringe",
                    "top":"#f2f2f2","topShade":"#c9c9c9","pants":"#2e3b55","shoes":"#1d1d1d","eyes":"#2a160c","extras":["earring_l"]}, ...}}
```
Nelle `px` di basi, capelli ed extra si usano lettere simboliche, che il composer sostituisce con i colori della persona: `S` pelle, `s` pelle in ombra, `H` capelli, `h` capelli in ombra, `T` maglia, `t` maglia in ombra, `P` pantaloni, `O` scarpe, `E` occhi, `K` contorno `#1a1020`, `W` bianco `#ffffff`. Qualsiasi altro carattere viene letto dal `pal` dell'extra. I frame sono `[fermo, passo1, passo2]`, e `right` è lo specchio di `left`.
Le persone sono: kiril, kiril_costume (costume ragno), marco, marco_armor, nicole, leryn, elisa, erika, moka, masia, bea, maki, martina, davi, efisio, bullone (base `bot` 16×16).

**Ritratti** (`portraits.json`): stesso schema con `bases.face` 40×40, `hair.<style>.face`, `extras.<id>.face` e `people.<id>` con riferimento ai colori di `characters.json` (`"from":"kiril"`) più `"extras":[...]` specifici del ritratto (`tongue`, `blush`).

**Mappa** (`maps/<id>.json`):
```
{"id":"town","name":"Santu Brugaru","music":"town","rows":["TTTTTT...", ...],
 "legend":{"T":"tree",".":"grass",...},
 "spawn":{"x":10,"y":12,"dir":"down"},
 "npcs":[{"id":"nicole","x":4,"y":5,"dir":"down","person":"nicole","dialogue":"nicole","if":"!party_started","wander":false}],
 "objects":[{"id":"duck_1","x":30,"y":2,"img":"duck","dialogue":"objects","node":"duck_1","if":"!duck_1","solid":true}],
 "pushables":[{"id":"art_1","x":3,"y":3,"img":"artichoke_big"}], "plates":[{"x":6,"y":3}], "platesFlag":"lab_solved",
 "warps":[{"x":8,"y":9,"to":"house","tx":4,"ty":8,"dir":"up","if":"","locked":"objects:door_locked"}],
 "triggers":[{"x":12,"y":12,"dialogue":"objects","node":"sabotage_seen","if":"!sabotage_seen"}]}
```

**Dialogo** (`dialogues/<id>.json`):
```
{"speaker":"Nicole","portrait":"nicole",
 "entry":[{"if":"got_risata","goto":"after"},{"goto":"intro"}],
 "nodes":{"intro":{"lines":["Testo...",{"who":"kiril","text":"Risposta"}],
                   "do":["set:met_nicole"],
                   "choices":[{"text":"Mi offendo.","if":"","do":["inc:offended"],"goto":"offeso"},{"text":"...","goto":"x"}],
                   "next":"altro","puzzle":{"id":"cipher","win":"cipher_win","lose":"cipher_lose"}}}}
```
In una riga `who` può essere `kiril`, `bullone`, `marco` oppure qualsiasi persona; se manca parla `speaker`. Un nodo termina in uno di questi modi: `choices`, `puzzle`, `next`, oppure niente (fine dialogo). In una riga `{"cond":"expr","text":...}` la riga compare solo se `expr` è vera.

**Condizioni:** stringhe con identificatori di flag, `!`, `&`, `|`, parentesi, e confronti `nome>=N`, `nome<N`, `nome==N` sui contatori o su `has.<item>`. Una stringa vuota o mancante vale vero.
**Effetti:** `set:f`, `unset:f`, `inc:c`, `dec:c`, `give:item`, `take:item`, `word:nicole:RISATA`, `warp:map:x:y:dir`, `face:npcId:dir`, `sound:name`, `music:name`, `costume:on`, `save`, `ending`, `accuse` (apre il tribunale), `fade`.

**Story** (`story.json`):
```
{"items":{"invito_strappato":{"name":"Invito strappato","desc":"...","kind":"evidence"}, "...":{}},
 "suspects":["masia","bea","davi"],
 "accusation":{"culprit":"davi","validEvidence":["stoffa_mantello","d20_glassa","testimone_leryn"],"need":2},
 "words":["nicole","leryn","elisa"],
 "hints":[{"if":"!got_bullone","lines":["vago","chiaro","quasi soluzione"]}, ...],
 "endings":{"perfect":"wrong_accusations==0 & ducks>=7 & costume","good":"wrong_accusations<=1","messy":""},
 "ducksTotal":7}
```

---

### Task 1: Setup repo, pagina, server (Tappa 0)

**Files:** Create `index.html`, `style.css`, `package.json`, `.gitignore` (`.DS_Store`, `node_modules/`, `*.local.*`), `.claude/launch.json`, `README.md`; spec e piano già presenti in `docs/`.

- [ ] **Step 1:** Scrivi `index.html` con `<canvas id="screen" width="256" height="192">`, `<div id="ui">` sovrapposto, i link ai Google Fonts `Pixelify Sans` e `Press Start 2P`, `<noscript>` e un `<div id="boot-error" hidden>`.
- [ ] **Step 2:** Scrivi `.claude/launch.json` con la config `game` (`python3 -m http.server 8080`, port 8080) e `package.json` con gli script `test` e `validate`.
- [ ] **Step 3:** Scrivi il README: comandi, struttura `data/`, regola "dopo aver cambiato le Parole-Chiave rilancia `encrypt-code`".
- [ ] **Step 4:** Avvia il server con `preview_start` `game` e verifica che la pagina carichi senza 404, a parte `src/main.js` che ancora manca.
- [ ] **Step 5:** Commit `chore: setup progetto, spec e piano`.

### Task 2: Condizioni e stato (logica pura, TDD)

**Files:** Create `src/game/conditions.js`, `src/game/state.js`, `tests/conditions.test.mjs`, `tests/state.test.mjs`.

**Interfaces — Produces:**
- `evaluate(expr: string|undefined, state: State) => boolean`
- `applyEffects(effects: string[]|undefined, state: State, hooks?: {[verb]: (args:string[]) => void}) => void`. Gli effetti di stato vengono applicati direttamente; gli altri verbi (`warp`, `face`, `sound`, `music`, `costume`, `ending`, `accuse`, `fade`, `save`) vanno a `hooks[verb]`, e se il verbo non è registrato compare un `console.warn`.
- `createState() => State`, con `{flags:Set, counters:{}, items:Set, words:{}, map:'house', x, y, dir, person:'kiril', playMs:0, version:1}`
- `serialize(state) => string`, `deserialize(str) => State|null`
- `save(state, storage = globalThis.localStorage) => boolean`, `load(storage) => State|null`, `clearSave(storage)`

- [ ] **Step 1: Test** in `tests/conditions.test.mjs`:
  - `evaluate('', s) === true`, `evaluate(undefined, s) === true`
  - con `flags = {a}`: `evaluate('a', s) === true`, `evaluate('!a', s) === false`, `evaluate('a & !b', s) === true`, `evaluate('(a | b) & !c', s) === true`
  - con `counters.ducks = 7`: `evaluate('ducks>=7', s) === true`, `evaluate('ducks<7', s) === false`, `evaluate('offended==0', s) === true` (un contatore mancante vale 0)
  - con l'oggetto `d20_glassa` in `items`: `evaluate('has.d20_glassa', s) === true`
  - `applyEffects(['set:x','inc:ducks','give:k','word:nicole:RISATA','take:k','unset:x'], s)` produce `ducks===8`, `!has k`, `!x`, `words.nicole==='RISATA'`
  - `applyEffects(['warp:town:3:4:up'], s, {warp: spy})` chiama la spia con `['town','3','4','up']`
  - un'espressione malformata (`'a & & b'`) restituisce `false` senza lanciare eccezioni
- [ ] **Step 2:** `node --test tests/conditions.test.mjs`. Atteso: FAIL perché il modulo non esiste.
- [ ] **Step 3:** Implementa un tokenizer più un parser a discesa ricorsiva (precedenza `!` > confronto > `&` > `|`).
- [ ] **Step 4: Test** in `tests/state.test.mjs`: il roundtrip `deserialize(serialize(s))` conserva Set e words; `load` con storage fake che contiene `'{rotto'` restituisce `null`; `load` con storage che lancia eccezioni restituisce `null`; `save` con storage che lancia eccezioni restituisce `false`; `deserialize` con `version:2` restituisce `null`.
- [ ] **Step 5:** Implementa `state.js`, poi `npm test`. Atteso: PASS.
- [ ] **Step 6:** Commit `feat: condizioni ed effetti, stato e salvataggi`.

### Task 3: Motore e mondo camminabile (Tappa 1)

**Files:** Create `src/main.js`, `src/engine/{loader,input,screen,scenes,art}.js`, `src/world/{tilemap,entity,world-scene}.js`, `data/manifest.json`, `data/art/tiles.json` (provvisori: 10 tile in tinta unita più bordo: grass, path, sand, water, tree, wall, roof, door, floor, counter), `data/art/characters.json` (base `normal` minimale più la persona kiril), `data/maps/town.json` (bozza definitiva del layout, 48×36), `tests/input.test.mjs`, `tests/tilemap.test.mjs`.

**Interfaces — Produces:**
- `loadAll(manifestUrl='./data/manifest.json') => Promise<Data>` dove `Data = {story, ending, secret, music, art:{tiles,characters,portraits,objects}, maps:{[id]}, dialogues:{[id]}}`. Il manifest è `{"maps":["town",...],"dialogues":["nicole",...],"art":["tiles","characters","portraits","objects"],"other":["story","ending","secret","music"]}`. In caso di fallimento: `showBootError(msg)`.
- `class Input { constructor(target=window); held(action):boolean; pressed(action):boolean; endFrame(); consume() }` con le azioni `up down left right ok back notebook hint run`. `pressed` è vero solo nel frame in cui il tasto passa da su a giù; `consume()` azzera i pressed e richiede un rilascio prima di un nuovo pressed per i tasti tenuti.
- `class SceneManager { push(scene); pop(); replace(scene); top; update(dt,input); draw(ctx) }`. Ogni scena ha `{update(dt,input), draw(ctx), enter?(), exit?(), overlay?:boolean}`, e le scene sotto un overlay vengono comunque disegnate. Push e pop chiamano `input.consume()`.
- `compileImage(img) => HTMLCanvasElement`, `composePerson(charactersJson, personId) => {w,h,frames:{down:[c,c,c],up:[...],left:[...],right:[...]}}`, `ArtCache` con `tile(name)`, `person(id)`, `object(name)`, `portrait(id)`.
- `parseMap(json, tilesJson) => GameMap` con `{id,w,h,tileAt(x,y),isSolid(x,y),warpAt(x,y),triggerAt(x,y)}`. Le righe di lunghezza diversa o i caratteri fuori legenda lanciano `Error` con `map id, riga, colonna`.
- `class Entity { x,y (tile), px,py (pixel), dir, moving, tryMove(dir, map, blockers) : boolean, update(dt) }`: un passo ogni 0,18 s camminando, 0,10 s correndo; il frame di camminata alterna passo1/passo2.
- `class WorldScene { constructor(game); loadMap(id, x, y, dir); update; draw }` con `game = {data, art, state, scenes, input, hooks}`.

- [ ] **Step 1: Test** `tests/input.test.mjs` con un target `EventTarget` finto: keydown ArrowUp → `pressed('up')` vero per un solo frame (dopo `endFrame()` diventa falso) e `held('up')` vero; dopo `consume()` con il tasto ancora premuto `pressed('ok')` resta falso finché non arriva un keyup e poi un nuovo keydown; `KeyZ`, `Enter` e `Space` mappano tutti su `ok`.
- [ ] **Step 2: Test** `tests/tilemap.test.mjs`: una mappa 3×2 `["T.T","..."]` con legend `{T:tree,.:grass}` dà `isSolid(0,0)` vero, `isSolid(1,0)` falso, `isSolid(-1,0)` vero (fuori mappa = solido); una riga corta lancia un errore il cui messaggio contiene `riga 1`.
- [ ] **Step 3:** Implementa i moduli; `npm test` → PASS.
- [ ] **Step 4:** Implementa `screen.js` (scala intera, centrato, overlay `#ui` con la stessa posizione e dimensione, variabile CSS `--s` = scala) e la camera centrata sul giocatore, bloccata ai bordi della mappa (la mappa più piccola della vista viene centrata).
- [ ] **Step 5:** Disegna il layout di `town.json`: casa di Kiril e Marco (sud-ovest), piazza centrale con fontana, Biblioteca (nord), Sala giochi "Game Over" (est), Laboratorio di Elisa (nord-est), Atelier dell'Accademia (ovest), Taverna "Il Drago Ubriaco" (sud-est), locale Su Nuraghe (nord, in cima alla via principale), campetto (est), chiosco sulla spiaggia (sud, mare lungo il bordo sud), porto (sud-ovest). Ogni edificio ha la porta su un tile `door` con un warp.
- [ ] **Step 6:** Verifica nel browser: Kiril cammina a griglia, non attraversa alberi e muri, la camera segue, il ridimensionamento della finestra mantiene i pixel nitidi; a 1366×768 la scala è 4. Fai uno screenshot.
- [ ] **Step 7:** Commit `feat: tappa 1 — si cammina per Santu Brugaru`.

### Task 4: Dialoghi, NPC, interni, autosave (Tappa 2)

**Files:** Create `src/game/dialogue-runner.js`, `src/game/dialogue-scene.js`, `data/maps/{house,library,arcade,lab,atelier,tavern,nuraghe}.json` (interni con layout definitivo), `data/dialogues/{nicole,objects}.json` (prova), `tests/dialogue.test.mjs`; Modify `src/world/world-scene.js`, `style.css`.

**Interfaces — Produces:**
- `createRunner(dialogue, state, {startNode?, hooks?}) => Runner`, dove `Runner = {current(): Step|null, next(): void, choose(index): void, done: boolean}` e `Step = {who, name, portrait, text, choices?: {text,index}[], puzzle?: {id,win,lose}}`. Le scelte sono filtrate per `if` e `index` si riferisce alla lista filtrata. Gli effetti `do` di un nodo si applicano quando si entra nel nodo; quelli di una scelta quando la si sceglie. Il nodo d'ingresso è il primo elemento di `entry` con `if` vero.
- `resolvePuzzle(runner, win:boolean)`: continua dal nodo `win` o `lose`.
- `DialogueScene(game, dialogueId, {node?, npc?})`: è un overlay; il testo appare carattere per carattere a 40 caratteri al secondo; Z completa la riga, poi passa alla successiva; ↑↓ e Z per le scelte; il ritratto a sinistra (dalla Task 6, fino ad allora un riquadro con l'iniziale); il nome del parlante in un'etichetta colorata. Quando il runner incontra un `puzzle`, la scena fa push della scena del puzzle (registro `game.puzzles[id](game, onResult)`); finché la Task 7 non c'è, uno stub `debugPuzzle` chiede "Vinci / Perdi".
- In `WorldScene`: Z davanti a un NPC → l'NPC si gira verso Kiril → `DialogueScene`. Gli oggetti funzionano allo stesso modo. Un warp con `locked` non soddisfatto apre il dialogo indicato; un warp valido fa dissolvenza (0,25 s), `loadMap` e `save`. I trigger scattano quando si entra nel tile.

- [ ] **Step 1: Test** `tests/dialogue.test.mjs`:
  - un dialogo con `entry` `[{if:'met',goto:'b'},{goto:'a'}]`: con lo stato vuoto parte da `a`, con `met` parte da `b`
  - le righe di un nodo si succedono con `next()`; una riga `{cond:'x',text:'T'}` viene saltata se `x` è falso
  - una scelta con `if:'has.k'` è nascosta senza l'oggetto `k`; `choose(0)` applica il suo `do` e va al suo `goto`
  - `do` di nodo `['set:visto']` si applica all'ingresso del nodo
  - un nodo con `puzzle` → `current().puzzle.id==='cipher'`; `resolvePuzzle(r,true)` va al nodo `win`
  - un `goto` verso un nodo inesistente → `done===true` più un `console.warn`, senza eccezioni
- [ ] **Step 2:** Verifica che i test falliscano, implementa il runner, poi PASS.
- [ ] **Step 3:** Implementa `DialogueScene` (DOM in `#ui`) e l'interazione nel mondo; i warp e i 7 interni sono collegati in entrambe le direzioni.
- [ ] **Step 4:** Verifica nel browser: entri in casa ed esci; parli con un NPC di prova con una scelta che imposta un flag; ricarichi la pagina e ti ritrovi nella stessa mappa con lo stesso flag (controllato da console con `JSON.parse(localStorage['kiril-bday-v1'])`); chiudere un dialogo tenendo premuto Z non lo riapre.
- [ ] **Step 5:** Commit `feat: tappa 2 — dialoghi a scelta, interni, salvataggio`.

### Task 5: Scheletro completo giocabile + crypto + validatore + deploy (Tappa 3)

**Files:** Create `src/game/{crypto,hints,notebook-scene,title-scene,ending-scene,debug}.js`, `src/puzzles/accusation.js`, `src/puzzles/accusation-scene.js`, `data/story.json`, `data/ending.json`, `data/secret.json`, `data/music.json` (`{}`), `data/dialogues/{kiril,marco,bullone,nicole,leryn,elisa,erika,moka,masia,bea,maki,martina,davi,efisio,objects}.json` (versione essenziale: 3–6 righe a nodo ma con la voce giusta, catena completa), `tools/encrypt-code.mjs`, `tools/validate-data.mjs`, `tests/{crypto,accusation,hints,validator}.test.mjs`.

**Interfaces — Produces:**
- `buildPassphrase(words:{nicole,leryn,elisa}, culprit) => string`: tutto minuscolo con trim, unito da `|` nell'ordine `story.words`, poi il colpevole.
- `encryptText(plain, passphrase, iter=150000) => Promise<{v:1,iter,salt,iv,ct}>` (base64), `decryptText(blob, passphrase) => Promise<string|null>` (null se la chiave è sbagliata). Usa solo `globalThis.crypto.subtle`, così gira identico nel browser e in Node.
- `judgeAccusation(suspect, evidenceIds:string[], rules) => 'correct'|'wrong_suspect'|'weak_evidence'`.
- `pickHint(story.hints, state) => {phaseIndex, line}`: la fase è la prima il cui `if` è vero; il livello è `counters['hint_'+phaseIndex]`, limitato a 2, e viene incrementato da chi lo chiama.
- `AccusationScene(game, onDone)`: scegli il sospettato, poi 2 prove dal taccuino (solo `kind:evidence`) e conferma. Con `correct` → `davi.json` nodo `confess`; con `wrong_suspect` → `inc:wrong_accusations` e `<sospettato>.json` nodo `accused`, si torna al locale; con `weak_evidence` → `davi.json` nodo `weak`, si riprova.
- `EndingScene(game)`: sceglie il finale con `story.endings` (primo vero nell'ordine perfect → good → messy), mostra le slide di `ending.json[finale]` (testo + immagine composta), poi `decryptText(secret, buildPassphrase(state.words, 'davi'))`. Se riesce mostra il pulsante "Apri il tuo regalo" (`<a target=_blank rel=noopener>`); se fallisce mostra "Il regalo è ancora chiuso: qualcosa non torna nelle tre parole" con un pulsante per tornare.
- `tools/encrypt-code.mjs <testo> [--words RISATA,BRONCIO,CORAGGIO] [--culprit davi]`: legge i default da `story.json`, scrive `data/secret.json`, stampa solo "ok" e lunghezza; il link non viene mai scritto altrove.
- `tools/validate-data.mjs`: exit code 1 con elenco `file: problema` se trova: righe di mappa disallineate, chiave di legenda non in tiles, warp verso mappa inesistente o tile solido, `dialogue`/`node` inesistente, `goto`/`next`/`win`/`lose` inesistente, condizione che non si parse, `give:` di un item non presente in `story.items`, persona o img non presente nell'art. Un flag letto ma mai impostato è un warning (exit 0).
- `debug.js` (attivo solo con `?debug=1`): F2 apre un pannello con warp verso ogni mappa, set/unset di un flag, "dai tutte le prove", "vai all'accusa", "vai al finale X"; espone `window.dbg = {state, warp, set, give}`.

**Catena di gioco (flag)**, da far funzionare tutta in questa task, con gli enigmi ancora stub:
1. In casa: trigger del letto → `marco.json:note1` (biglietto con indovinello "dove dormi quando ti offendi" → divano) → oggetto divano → trovi Bullone: `got_bullone`. La porta di casa è `locked` finché non hai `got_bullone`.
2. Uscita in paese: trigger davanti a Su Nuraghe → `objects:sabotage_seen` (locale chiuso, inviti strappati per terra → `give:invito_strappato`), Bullone riproduce `marco:msg_sabotage` ("Qualcuno ha incasinato tutto. Trova chi è e trova me. Tre parole aprono la porta.").
3. Nicole, puzzle `cipher` → `word:nicole:RISATA` + `got_risata`. Leryn, puzzle `combo` → `word:leryn:BRONCIO` + `set:got_broncio` + `give:testimone_leryn`. Elisa, dopo `lab_solved` + spada → `word:elisa:CORAGGIO` + `set:got_coraggio`.
4. Martina, scelta empatica → `give:tessuto_rosso`. Moka → `give:filo_verde` (+ conteggio paperelle). Erika, con tessuto e filo → `set:costume` + `costume:on` (hook che cambia `state.person` in `kiril_costume`), poi con l'`invito_strappato` → `give:stoffa_mantello`.
5. Masia, puzzle `rps` → `give:alibi_masia`. Maki, enigma d'umore → `give:cassa_maki` + `give:alibi_bea`. Bea (a caso) → `give:volantino_complotto` (falsa pista). Retro di Su Nuraghe: oggetto `d20` → `give:d20_glassa`. Davi: con `has.cassa_maki` si sveglia → `davi_awake` + racconto della "campagna".
6. Porta di Su Nuraghe: `locked` finché non è vero `got_risata & got_broncio & got_coraggio`; entrando → `accuse`.
7. `confess` → festa → `ending`.

- [ ] **Step 1: Test** `tests/crypto.test.mjs`: `decryptText(await encryptText('https://example.test/x','a|b|c|davi',1000),'a|b|c|davi') === 'https://example.test/x'`; con la passphrase `'a|b|c|masia'` → `null`; `buildPassphrase({nicole:' RISATA',leryn:'Broncio',elisa:'coraggio'},'Davi') === 'risata|broncio|coraggio|davi'`.
- [ ] **Step 2: Test** `tests/accusation.test.mjs`: le regole sono quelle di story.json. `('davi',['stoffa_mantello','d20_glassa'])` → `correct`; `('davi',['d20_glassa','volantino_complotto'])` → `weak_evidence`; `('masia',['stoffa_mantello','d20_glassa'])` → `wrong_suspect`.
- [ ] **Step 3: Test** `tests/hints.test.mjs`: con fasi `[{if:'!a',lines:[1,2,3]},{if:'',lines:[4,5,6]}]` e stato vuoto → fase 0 riga 1; con `hint_0=5` → riga 3; con `a` → fase 1.
- [ ] **Step 4: Test** `tests/validator.test.mjs`: il validatore esporta `validate(data) => {errors:string[], warnings:string[]}`. Su una fixture con `goto:'nope'` gli errori contengono `nope`; i dati reali del repo danno `errors.length === 0`.
- [ ] **Step 5:** Implementa i moduli e i JSON della catena; `npm test` e `npm run validate` sono verdi.
- [ ] **Step 6:** `node tools/encrypt-code.mjs "<link fornito da Marco in chat>"`; poi `grep -r "lockee" . --exclude-dir=.git` non deve trovare niente.
- [ ] **Step 7:** Nel browser senza debug fai la partita più veloce possibile, con gli stub degli enigmi, dall'inizio agli auguri; il pulsante del regalo appare. Prova un'accusa sbagliata → scena comica → si riprova. Ricarica a metà → riprende.
- [ ] **Step 8:** Commit `feat: tappa 3 — gioco completo dall'inizio agli auguri`.
- [ ] **Step 9: Deploy.** `brew install gh` (se brew manca: `curl` dell'installer ufficiale di GitHub CLI, previo OK di Marco); **Marco esegue `gh auth login` nel terminale**; poi `gh repo create themarkk/kiril-birthday --public --source . --push` e `gh api -X POST repos/themarkk/kiril-birthday/pages -f "source[branch]=main" -f "source[path]=/"`. Verifica che `https://themarkk.github.io/kiril-birthday/` carichi e che il titolo compaia.

### Task 6: Pixel art (Tappa 4)

**Files:** Modify `data/art/{tiles,characters,portraits,objects}.json`, `src/engine/art.js` (composer dei ritratti, animazione dell'acqua a 2 frame), `src/game/title-scene.js` (logo "IL COMPLEANNO DI KIRIL", Kiril e Bullone animati, mare).

- [ ] **Step 1:** Tile del paese (palette calda mediterranea, contorni scuri non neri, luce da nord-ovest): erba con 2 varianti, sentiero lastricato, sabbia, acqua (2 frame), schiuma della riva, alberi (ulivo, palma, entrambi `over` per la chioma), siepe di fichi d'India, muri intonacati bianco, ocra e rosa, tetti di coppi rossi in 3 pezzi (sx/centro/dx, `over`), porte, finestre con persiane verdi, insegne dei locali (libro, joystick, carciofo, ago, boccale, nuraghe), fontana 2×2, panchina, lampione, murales "Santu Brugaru", cartello turistico, rete del campetto, ombrellone, barche. Interni: parquet, piastrelle, tappeto, scaffali di libri, statue (8 dèi su un piedistallo), cabinati arcade, tavolo DnD con mappa, botti, macchina da cucire, manichino, cesto di paperelle, pannelli scenografici, carciofi giganti, palco della festa, letto, divano, frigo.
- [ ] **Step 2:** Personaggi: base `normal` 16×24 e `tall` 16×32 con 3 frame per direzione; capigliature `fringe` (Kiril), `messy` (Marco), `long_straight` (Moka, Erika in arancio, Bea), `long_flat` (Elisa nero), `long_wick` (Masia), `bob` (Maki biondo), `short_messy` (Davi), `short` (Leryn), `curly_red` (Martina), `bun` (Nicole), `bald_cap` (Efisio con coppola); extra: glasses (Maki, Elisa, Davi, Leryn, Bea), beard_long (Davi), stubble (Marco, Leryn), earring_l (Kiril), piercings (Bea), chain (Marco), cape (Davi), headphones (Leryn), duck_pin (Moka), book (Nicole). Colori dalla spec (Moka tutta verde, Masia total black, Marco con maglione panna). `kiril_costume`: tuta rossa e blu con motivo a ragnatela nostro (ragno stilizzato originale sul petto). `marco_armor`: armatura di cartone dipinta con nastro adesivo. Bullone: robot 16×16 col bullone in testa e luce sul petto.
- [ ] **Step 3:** Ritratti 40×40 per tutti i principali con l'espressione tipica: Kiril con la linguaccia e le guance rosate, Marco con il mezzo sorriso sicuro, Masia accigliato, Davi assonnato, Leryn annoiato, Bea con un ghigno, Maki raggiante, Martina che canta, Nicole con il dito alzato, Elisa pensierosa, Erika con un ago tra le labbra, Moka entusiasta, Efisio sdentato.
- [ ] **Step 4:** Oggetti: paperella verde, D20 con glassa, busta sigillata di Marco, invito strappato, carciofo gigante (spingibile), carciofo con spada, cassa di Maki, torta spiaccicata, coriandoli.
- [ ] **Step 5:** `npm run validate` verde; screenshot della piazza, di un interno e di un dialogo con ritratto; controlla a occhio che ogni amico si riconosca dalla sagoma e dai colori. Correggi ciò che non si legge.
- [ ] **Step 6:** Commit `feat: tappa 4 — pixel art originale di Santu Brugaru e degli amici`.

### Task 7: Enigmi 1 (Tappa 5)

**Files:** Create `src/puzzles/{cipher,cipher-scene,rps,rps-scene}.js`, `tests/puzzles1.test.mjs`; Modify `data/dialogues/{marco,nicole,masia,maki}.json`, `data/story.json` (hints).

**Interfaces — Produces:**
- `checkStatues(order:string[], solution:string[]) => boolean`. La soluzione `['efesto','rea','orfeo','eros']` arriva da `nicole.json` → `"puzzleData":{"cipher":{"slots":4,"pool":["efesto","rea","orfeo","eros","atena","ermes","ade","ercole"],"solution":[...],"clues":["Faber claudus, ferrum in igne domat","Mater deorum, lapidem pro filio dedit","Cantor qui ad inferos descendit","Puer alatus, sagittis corda ferit"]}}`. La scena mostra 4 piedistalli con l'indizio latino sotto ciascuno: ←→ sceglie il piedistallo, ↑↓ la statua, Z conferma tutto, X esce (= sconfitta, si può riprovare). Nicole può tradurre un indizio per volta (scelte di dialogo).
- `masiaMove(prevPlayer: 'sasso'|'carta'|'forbice'|null) => move`: con `null` gioca sasso, altrimenti la mossa che batte `prevPlayer`. `outcome(player, masia) => 1|0|-1`. `createRps() => {play(move) => {masia, result, score:{p,m}, over, won}}`: vince chi arriva prima a 3.
- Maki: enigma solo con dialogo. Maki cambia umore a ogni frase (euforico, drammatico, arrabbiato, tenero) e Kiril deve rispondere col registro giusto 3 volte di fila (contatore `maki_ok`, azzerato da una risposta sbagliata). Vince con `give:cassa_maki` + `give:alibi_bea`.
- Biglietto di Marco: indovinello "dove dormi quando ti offendi" → divano. Ci sono 3 oggetti cliccabili in casa (letto, frigo, divano) con battute; il divano dà Bullone.

- [ ] **Step 1: Test** `tests/puzzles1.test.mjs`: `checkStatues(sol, sol)` vero e con un ordine diverso falso; `masiaMove(null)==='sasso'`, `masiaMove('sasso')==='carta'`, `masiaMove('carta')==='forbice'`, `masiaMove('forbice')==='sasso'`; la strategia vincente (giocare ciò che batte `masiaMove(miaPrecedente)`, cioè carta al primo turno) vince 3-0 contro `createRps`; `outcome('carta','sasso')===1`.
- [ ] **Step 2:** Verifica che falliscano, implementa, PASS.
- [ ] **Step 3:** Collega le scene a `game.puzzles` (`cipher`, `rps`) e scrivi i dialoghi d'enigma con la voce piena (Nicole pedante ed entusiasta dei miti; Masia che bara e insulta; Maki con gli sbalzi d'umore), più gli aiuti di Bullone a 3 livelli per ciascuno. Masia, dopo 2 sconfitte: Bullone "Hai notato cosa gioca rispetto a TE?".
- [ ] **Step 4:** Verifica nel browser ogni enigma vinto e perso, e l'uscita con X.
- [ ] **Step 5:** Commit `feat: tappa 5 — statue di Nicole, morra di Masia, Maki, biglietto di Marco`.

### Task 8: Enigmi 2 (Tappa 6)

**Files:** Create `src/puzzles/{combo,combo-scene,sokoban}.js`, `tests/puzzles2.test.mjs`; Modify `src/world/world-scene.js` (pushable, plates, reset), `data/maps/lab.json`, `data/dialogues/{leryn,elisa,erika,moka,martina,davi,objects}.json`.

**Interfaces — Produces:**
- `judgeCombo(expected:string[], given:string[]) => 'ok'|'wrong'|'partial'`; `createComboMatch(rounds=[['down','right','ok'],['left','down','right','ok'],['down','down','up','back','ok']]) => {input(key, tMs), state}`. Ogni round: la combo si vede per 2 s, poi va inserita entro 3 s; un errore = round perso; si vince al meglio di 3. Dopo 2 match persi Leryn dice "Ti lascio vincere che mi fai pena" → flag `leryn_pity`, vittoria comica.
- `tryPush(grid:{isSolid(x,y)}, boxes:{x,y}[], player:{x,y}, dir) => {boxes, moved:boolean}`: un blocco si sposta solo se la cella dietro è libera e non contiene un altro blocco. `allOnPlates(boxes, plates) => boolean`. Reset: uscire dal laboratorio o scegliere "Rimetti a posto" con Elisa riporta i blocchi alle posizioni del JSON. Il layout è 3 carciofi e 3 piastre, risolvibile in circa 20–30 mosse, ed è verificato dal test con la sequenza di soluzione salvata in `lab.json` → `"solution":"RRUL..."`.
- Spada nel carciofo: dopo `lab_solved` l'oggetto `artichoke_sword` richiede 3 Z di fila con frasi crescenti ("Tira!" / "TIRA!" / "TIRAAAA") → jingle → busta `CORAGGIO`.
- Costume: Erika con `has.tessuto_rosso & has.filo_verde` → scena di cucito → `costume:on` (la persona del giocatore diventa `kiril_costume`; il dialogo con Erika permette di toglierlo e rimetterlo).
- Davi: senza la cassa dorme (righe di russare diverse a ogni visita); con la cassa → Maki fa partire la musica a palla → Davi si sveglia e racconta la "campagna" che accusa Masia e Bea. Le contraddizioni sono parlando con Davi come scelta "Ma tu dov'eri?" → "A casa, a dormire" (contro la testimonianza di Leryn sul mantello).

- [ ] **Step 1: Test** `tests/puzzles2.test.mjs`: `judgeCombo(['a','b'],['a'])==='partial'`, `(['a','b'],['a','c'])==='wrong'`, `(['a','b'],['a','b'])==='ok'`; `tryPush` contro un muro → `moved:false`; contro un blocco dietro un altro blocco → `moved:false`; la sequenza `solution` di `lab.json` applicata da zero dà `allOnPlates === true` (**sokoban reset**: dopo il reset i blocchi tornano uguali a quelli del JSON).
- [ ] **Step 2:** Verifica che falliscano, implementa, PASS.
- [ ] **Step 3:** Integra nel mondo (animazione di spinta, piastra illuminata quando è coperta, jingle alla soluzione), collega `combo`, scrivi i dialoghi d'enigma e gli aiuti di Bullone.
- [ ] **Step 4:** Nel browser risolvi il laboratorio a mano, perdi e vinci il picchiaduro, indossa il costume, sveglia Davi.
- [ ] **Step 5:** Commit `feat: tappa 6 — carciofi di Elisa, picchiaduro di Leryn, costume, sveglia di Davi`.

### Task 9: Dialoghi pieni e contenuti (Tappa 7)

**Files:** Modify tutti i `data/dialogues/*.json`, `data/ending.json`, `data/story.json` (hints di ogni fase, paperelle), `data/maps/*.json` (7 paperelle, Efisio, comparse alla festa).

**Regole di scrittura** (vincolanti; la scrittura dei personaggi è parallelizzabile, un subagente per gruppo, purché tutti rispettino i formati e i flag della catena della Task 5):
- Ogni personaggio ha un tic verbale riconoscibile e almeno una battuta che fa ridere davvero, legata alla sua descrizione. Masia insulta e vuole vincere tutto, look da sicario; Leryn monosillabi, sbuffi, bestemmie a mezza bocca censurate in stile `porc*`, solo picchiaduro; Davi parla come un master ("Tira per iniziativa"), dorme, promette e non mantiene; Bea è genderfluid, al neutro, complotti assurdi, mosse inventate stile anime ("Espansione del dominio: Ufficio Postale Infinito"); Maki al neutro, sbalzi d'umore, energia brat, cita "la regina" senza citare testi; Martina canta ogni frase, fiera sassarese contro tutti; Nicole infila latino e mitologia ovunque e si emoziona; Elisa scenografa, orgoglio di Samassi "regno dei carciofi", tutto è una scenografia; Erika sarta, giudica i vestiti di tutti, parla di Belle Arti; Moka paperelle e verde, "quack" come intercalare; Efisio storpia "Kiril" ogni volta in modo diverso (lista di almeno 8 storpiature a rotazione, contatore `efisio_talks`).
- Kiril parla nelle scelte: c'è sempre una risposta normale, una giocosa e spesso "Mi offendo." (`inc:offended`), che porta a una reazione dedicata del personaggio. Alla quinta offesa: Bullone riproduce `marco:msg_permaloso` (una volta sola, flag `permalosometro`).
- Gag bulgare con misura: banitsa, yogurt "quello vero", "Наздраве!", il cartello turistico "Attrazione: un bulgaro autentico", il paese che non sa dov'è la Bulgaria. Mai cattiverie: è autoironia.
- Parolacce dove sono nel personaggio (Masia, Leryn, Maki nei momenti drammatici), non in ogni riga.
- Battute brevi: al massimo circa 140 caratteri per riga, così stanno in 2–3 righe di box.
- Voce di Marco (biglietti, messaggi di Bullone, finale): sicura, ironica, "genio miliardario", che alla fine si scioglie. Il testo degli auguri in `ending.json` porta in cima la chiave `"_nota":"Marco: ritocca questi testi prima delle 8"`.
- Paperelle: 7 oggetti `duck_1..7` in punti che premiano l'esplorazione (dietro la fontana, sul molo, sotto l'ombrellone, nella biblioteca, sopra un cabinato, in taverna, sul tetto basso visibile dalla spiaggia). Ognuna fa `inc:ducks`, ha una battuta di Moka via Bullone, e Moka le riconta.
- I 3 finali in `ending.json`: `perfect`, `good`, `messy`. Ognuno ha 5–7 slide `{img, text}`: festa (Elisa ha montato tutto, torta di ripiego di Davi "chiedo umilmente perdono, master"), Marco entra in armatura di cartone, Martina canta gli auguri, battuta finale diversa per finale, auguri di Marco, poi il pulsante del regalo.

- [ ] **Step 1:** Scrivi i dialoghi di tutti i personaggi in base alle regole e alla catena; prima di ogni commit `npm run validate` deve essere verde.
- [ ] **Step 2:** Scrivi `story.hints` per ogni fase della catena (almeno 10 fasi, 3 livelli ciascuna).
- [ ] **Step 3:** Rileggi tutto ad alta voce come Kiril: togli ogni riga generica o "da AI" (espressioni vuote, entusiasmo finto, spiegoni). Ogni riga deve avere personalità o informazione.
- [ ] **Step 4:** Commit `feat: tappa 7 — voci complete, paperelle, permalosometro, finali`.

### Task 10: Atmosfera (Tappa 8, sacrificabile)

**Files:** Create `src/engine/audio.js`; Modify `data/music.json`, `world-scene.js`, `dialogue-scene.js`, `ending-scene.js`, `style.css`.

**Interfaces — Produces:** `Audio = {unlock(), blip(pitch), sfx(name), jingle(name), music(track|null)}`. Le tracce in `music.json` sono `{"town":{"bpm":112,"wave":"square","lead":"C5:1 E5:1 G5:2 ...","bass":"C3:2 G2:2 ...","loop":true}}`. Altre tracce: `title`, `house`, `interior`, `tension` (accusa), `party`. Jingle `item`, `solve`, `wrong`, `door`. L'audio si sblocca alla prima pressione di tasto sul titolo. Volume master 0.25, tasto M per il muto.

- [ ] **Step 1:** Implementa il sintetizzatore e le tracce; blip per carattere nel typewriter (pitch per personaggio), suoni di passi e porte.
- [ ] **Step 2:** Juice: dissolvenze tra le mappe, "!" sopra l'NPC quando Kiril gli è accanto per la prima volta, coriandoli su canvas nel finale, scossa dello schermo all'accusa sbagliata.
- [ ] **Step 3:** Commit `feat: tappa 8 — musica chiptune e rifiniture`.

### Task 11: Playtest e consegna (Tappa 9)

- [ ] **Step 1:** `npm test` e `npm run validate` verdi.
- [ ] **Step 2:** Partita completa nel browser senza debug, cronometrata (obiettivo 45–65 minuti per chi non conosce le soluzioni; il tempo si stima sommando i passaggi più gli enigmi giocati davvero). Annota ogni punto in cui ti blocchi e rinforza l'aiuto di Bullone corrispondente.
- [ ] **Step 3:** Con `?debug=1` prova i finali perfect, good e messy; accusa ogni sospettato; ricarica la pagina durante un enigma e verifica che si riparta coerenti.
- [ ] **Step 4:** `grep -ri "lockee" . --exclude-dir=.git` → vuoto. `data/secret.json` si decifra solo con `risata|broncio|coraggio|davi`.
- [ ] **Step 5:** Commit e `git push`; apri `https://themarkk.github.io/kiril-birthday/` in una scheda pulita (senza salvataggi) e verifica il titolo e i primi 2 minuti di gioco.
- [ ] **Step 6:** Lascia a Marco: dove ritoccare i testi (`data/ending.json`, `data/dialogues/marco.json`) e il comando per ripubblicare.
