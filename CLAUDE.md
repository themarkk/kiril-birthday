# Il Compleanno di Kiril

Gioco in pixel art (JS puro, nessuna dipendenza) regalo di compleanno di Marco per Kiril. Giallo di circa un'ora a Santu Brugaru.
Online: https://themarkk.github.io/kiril-birthday/ (GitHub Pages, repo pubblico `themarkk/kiril-birthday`, branch `main`).

## Prima di lavorare
- Esegui `git status`: altre sessioni possono avere modifiche non salvate. Non annullarle e non committarle se non sono tue.
- Una chat per compito. Leggi solo i file che servono, non tutto il progetto.

## Comandi
- Test: `npm test` (tutti verdi prima di pubblicare). Contenuti: `npm run validate` (0 errori).
- Provare in locale: `node tools/serve.mjs 8080`, poi http://localhost:8080/?debug=1 (F2 = pannello di prova).
- Pubblicare: `git add <file> && git commit -m "..." && git push` (il sito si aggiorna in ~1 minuto). `gh` è in `~/.local/bin/gh` (account `themarkk`).
- Commit: chiudi il messaggio con la riga di attribuzione indicata dalla sessione.

## Dove sta cosa
- `data/dialogues/<persona>.json` dialoghi (nodi, scelte, condizioni). `marco.json` e `data/ending.json` sono i testi di Marco: li ritocca lui.
- `data/story.json` oggetti/prove, aiuti di Bullone, regole dell'accusa, finali, configurazione enigmi.
- `data/maps/*.json` mappe (righe di caratteri + legenda, PNG, oggetti, porte). `data/art/*.json` pixel art. `data/music.json` musiche.
- `src/` codice: `engine/` (input, arte, audio), `world/` (mondo, mappe), `game/` (dialoghi, stato, finale), `puzzles/` (minigiochi).
- Dopo aver cambiato un JSON: `npm run validate`. Formati e storia completa: `docs/superpowers/specs/` e `docs/superpowers/plans/`.

## Regole da rispettare
- Il link del regalo è SOLO cifrato in `data/secret.json` (chiave = tre parole RISATA|BRONCIO|CORAGGIO + colpevole `davi`). Non scriverlo mai in chiaro in nessun file. Per ricifrare: `node tools/encrypt-code.mjs "<link>"`.
- Genere: Maki e Bea al neutro; Masia, Leryn, Davi al maschile; Moka, Erika, Elisa, Nicole, Martina al femminile.
- Marco e Kiril non si dicono "amore" né "ti amo": usare "ciccio" e "ti voglio tanto bene". Tono sboccato ammesso dove è nel personaggio.
- Niente personaggi o grafica protetti (Marvel, Nintendo, Pokémon): solo omaggi originali. Eccezione voluta da Marco: Spider-Man e Nintendo Switch veri, ma solo nel minigioco della Switch e con sprite disegnati da noi.
- Ogni menu di dialogo deve avere un'uscita; ogni enigma deve poter essere ripetuto. Il validatore lo controlla.

## Decisioni importanti
- Stack: JS puro + canvas 256x192, pixel art come griglie di caratteri nei JSON. Hosting: GitHub Pages.
- Colpevole: Davi. Falsi sospettati: Masia e Bea. Tre finali (perfetto, buono, pasticciato).
- Minigioco della Switch (casa, sotto la TV): solo uno sfizio, nessun effetto su storia e salvataggio. Fisica in `src/puzzles/swing.js`, scena in `swing-scene.js`, schermate e testi in `data/swing.json`.
- Sul sito pubblico resta raggiungibile `?debug=1` (pannello di prova). Da valutare se toglierlo.

## Tenere aggiornato questo file
Quando si prende una decisione che cambia come funziona il gioco o come si lavora (nuova regola, nuovo comando, scelta di storia, cosa è finito o rimandato), aggiungi una riga qui, in modo breve. Non copiare la cronologia dei commit: sta già in git. Tieni il file sotto le 70 righe.
