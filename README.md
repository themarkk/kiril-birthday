# Il Compleanno di Kiril

Un piccolo giallo in pixel art per il compleanno di Kiril, ambientato a *Santu Brugaru*.
Si gioca nel browser da PC.

## Giocare in locale

```bash
python3 -m http.server 8080
```

Poi apri http://localhost:8080. Aprire il file `index.html` direttamente non funziona: il browser blocca il caricamento dei JSON.

**Comandi:** frecce/WASD per muoversi · Shift per correre · Z/Invio/Spazio per parlare e confermare · X/Esc per annullare · I per il Taccuino · H per Bullone (aiuti) · M per il muto.

Debug: aggiungi `?debug=1` all'indirizzo e premi F2.

## Modificare il gioco

Tutto il contenuto è in `data/`:

| File | Cosa contiene |
|---|---|
| `data/dialogues/<persona>.json` | dialoghi di ogni personaggio, con scelte, condizioni ed effetti |
| `data/dialogues/marco.json` | **biglietti e messaggi di Marco (da ritoccare)** |
| `data/ending.json` | **festa finale e auguri (da ritoccare)** |
| `data/story.json` | oggetti e prove, aiuti di Bullone, regole dell'accusa, finali |
| `data/maps/*.json` | mappa del paese e interni (righe di caratteri + legenda) |
| `data/art/*.json` | pixel art: tile, personaggi, ritratti, oggetti |
| `data/music.json` | musiche chiptune |

Dopo ogni modifica:

```bash
npm run validate
```

```bash
npm test
```

## Il premio

Il link del regalo è cifrato in `data/secret.json` e si apre solo con le tre Parole-Chiave e il nome del colpevole.
Se cambi le parole o il link:

```bash
node tools/encrypt-code.mjs "<link del regalo>"
```

## Pubblicare

```bash
git add -A && git commit -m "ritocchi" && git push
```

GitHub Pages aggiorna https://themarkk.github.io/kiril-birthday/ in circa un minuto.
