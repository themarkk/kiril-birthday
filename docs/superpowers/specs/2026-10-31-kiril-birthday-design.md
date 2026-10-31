# "Il Compleanno di Kiril" — Design + Piano a tappe

## Context
Marco vuole regalare al suo ragazzo **Kiril** (compleanno: **domani mattina, 1 nov 2026**) un gioco 2D pixel art nel browser, stile vecchi Pokémon (visuale dall'alto, movimento a griglia) ma con grafica e personaggi **originali**. È un piccolo giallo di ~1 ora, ambientato in un paese sardo, con gli amici veri come personaggi. Premio: **1 codice regalo Nintendo Switch** alla fine + schermata di auguri. Dialoghi, mappe e storia in **JSON separati dal codice**, modificabili via prompt. Pubblicazione: **GitHub Pages**. Solo **PC** (tastiera). Cartella di progetto vuota; Node 22 e git disponibili.

**Principio guida (dettato dalla scadenza):** il gioco è giocabile dall'inizio alla fine già dalla Tappa 3; ogni tappa successiva aggiunge profondità. A qualunque ora ci si fermi, Kiril ha un gioco completo con codice e auguri.

**Decisioni confermate da Marco:** premessa "Marco sparito + festa sabotata"; Davi colpevole, Masia e Bea sospettati; tutti i personaggi "carichi", esagerati, linguaggio scurrile/NSFW ammesso; Kiril capisce l'italiano perfettamente (slang, sardo, doppi sensi ok, chicche in bulgaro); stack JS puro; GitHub Pages, repo pubblico **`kiril-birthday`** → `themarkk.github.io/kiril-birthday`; consegna **online entro le 8:00 del 1/11**; premio = il link Lockee fornito da Marco (cifrato, mostrato solo nel finale; niente combinazione); biglietti di Marco, messaggi di Bullone e auguri li scrivo io nella voce di Marco, lui li ritocca (file dedicato `data/dialogues/marco.json` + `data/ending.json`, segnalati nel README).

**Generi per i dialoghi:** Moka, Erika, Elisa, Nicole, Martina femminile; Masia, Leryn, Davi maschile; **Maki e Bea neutro** (Bea genderfluid).

**Aspetto per gli sprite:**
- **Kiril:** ~20-25 anni, capelli castano scuro corti tessurizzati con frangetta in avanti, sopracciglia folte scure, occhi castani grandi, carnagione chiara olivastra con guance rosate, cerchietto argento orecchio sinistro, t-shirt bianca girocollo. Espressione giocosa (linguaccia nel ritratto dei dialoghi).
- **Marco:** ~20 anni, capelli castano scuro corti-medi spettinati, sopracciglia folte, barba di due giorni, maglione panna su t-shirt bianca, catenina d'oro.
- **Erika:** capelli arancioni lisci. **Moka:** capelli castani lunghi lisci, tutta in verde. **Maki:** occhiali, capelli biondi mezzi corti. **Elisa:** occhiali, alta e magra, capelli lunghi neri lisci. **Masia:** capelli lunghi, look total black alla John Wick. **Davi:** trasandato, barba lunga, peli ovunque, occhiali, capelli corti in disordine. **Leryn:** altissimo, robusto, occhiali, barbetta corta incolta. **Bea:** look anime cyberpunk, piercing, occhiali, capelli castani lunghi. **Martina:** capelli rossi. **Nicole:** (proposta) look da studentessa di classici, maglione e libri.
- I personaggi più alti (Leryn, Elisa) usano sprite 16×32 con testa più alta; ritratti 48×48 nei box di dialogo per tutti i principali.

## Goals / Non-goals / Anti-goals
- **Goals:** mistero che si risolve deducendo; ogni amico con voce fortissima e riconoscibile; enigmi vari che si incastrano; scelte di dialogo con conseguenze; ~50–65 min; codice non leggibile dai file.
- **Non-goals:** mobile/touch, combattimenti RPG, salvataggi multipli, localizzazione, mappa enorme.
- **Anti-goals:** personaggi piatti; fetch-quest di riempimento; testi generici "da AI"; grafica o personaggi Marvel/Nintendo/Pokémon copiati (solo omaggi originali); il gioco che si blocca senza via d'uscita; perdere un'ora di progressi chiudendo la scheda.

## Approaches (scelta: 1)
1. **JS puro (ES modules) + Canvas, zero dipendenze, pixel art come griglie di caratteri nei JSON** — scelto: massimo controllo, nessuna build, tutto originale, dati modificabili via prompt, nulla che si rompa sotto scadenza.
2. Phaser 3 + Tiled — scartato: setup lungo, mappe Tiled poco modificabili via prompt, servono asset esterni.
3. JS puro + asset CC0 (Kenney) — scartato: stile generico, amici non riconoscibili.

## La storia
**Paese:** *Santu Brugaru* (proposta: gioco di parole sardo-bulgaro, nome che tutti storpiano), paesino sul mare.

**Premessa.** Mattina del compleanno. Kiril si sveglia: Marco non c'è. Sul cuscino un biglietto-indovinello. Uscendo scopre che la festa è stata sabotata: torta sparita, inviti strappati, il locale *Su Nuraghe* chiuso. Due fili:
- **Filo pianificato (Marco):** Marco, "genio miliardario" stile Iron Man, ha preparato una caccia: 3 **Parole-Chiave** custodite dagli amici aprono il locale e portano a lui.
- **Filo del sabotaggio:** qualcuno ha combinato un guaio e depista.

**Verità.** **Davi** doveva custodire la torta, si è addormentato, l'ha distrutta (ci ha dormito sopra). Da game master DnD, invece di confessare ha costruito una "campagna" di falsi indizi che puntano a Masia e Bea.

**Sospettati:** Masia (ovvio, prepotente), Bea (spara scemenze, depista senza volerlo), Davi (vero colpevole).

**Bullone** — robottino costruito da Marco (omaggio originale a Iron Man): sistema di aiuti a 3 livelli (vago → chiaro → quasi soluzione), tasto H. Trasmette messaggi registrati di Marco.

### Cast (tutti al massimo; linguaggio colorito/parolacce dove sono nel personaggio)
| Personaggio | Ruolo | Luogo | Enigma / funzione |
|---|---|---|---|
| Kiril | protagonista | — | permaloso: opzione "Mi offendo" ricorrente |
| Marco | assente, finale | — | biglietti, messaggi via Bullone, entrata trionfale in armatura di cartone |
| Nicole | aiutante | Biblioteca | cifrario mitologico (statue di dèi da ordinare) → Parola 1 |
| Leryn | aiutante scazzato | Sala giochi | sfida picchiaduro a combo (input a tempo) → Parola 2 + testimonianza "uno col mantello e una scatola" |
| Elisa | aiutante | Laboratorio scenografie (carciofi ovunque, Samassi pride) | puzzle a spinta di blocchi (carciofi giganti) + spada nel carciofo (omaggio Zelda) → Parola 3 |
| Erika | aiutante | Atelier Accademia | costume ragno originale per Kiril: servono tessuto rosso (Martina) e filo verde (Moka). Riconosce la stoffa sugli inviti strappati: è il mantello DnD che **lei** ha cucito per Davi → **prova chiave**. Indossarlo cambia lo sprite |
| Moka | missione secondaria | Atelier / ovunque | 7 paperelle verdi nascoste nella mappa → finale perfetto; dà filo verde |
| Masia | falso sospettato | Campetto | morra cinese truccata: bara sempre giocando ciò che batte la tua mossa precedente → capirlo e batterlo = alibi (timbro palestra) |
| Bea | depistatore | in giro | teorie del complotto assurde, mosse "espansione del dominio" inventate; alibi confermato da Maki |
| Maki | comparsa+ | Chiosco con cassa | sbalzi d'umore: rispondere all'umore giusto (enigma di dialogo) → presta la cassa per svegliare Davi; conferma alibi Bea |
| Martina | comparsa+ | Piazza (canta) | odiata perché sassarese: difenderla (scelta empatica, "anch'io sono straniero") → tessuto rosso; canta gli auguri nel finale |
| Davi | colpevole | Taverna DnD | dorme: va svegliato con la cassa di Maki; racconta la sua "campagna" con contraddizioni; indizio: **D20 con la glassa** sul retro del locale |
| Tziu Efisio | PNG paesano | Piazza | storpia il nome di Kiril ogni volta (Cirillo, Kirill-con-due-elle…), gag bulgaro-in-Sardegna |

### Flusso (~60 min)
0. Casa (3'): biglietto di Marco → indovinello → trovare Bullone (tutorial movimento, dialoghi, aiuti).
1. Esplorazione libera (10'): incontri, gag, si scopre il sabotaggio; il Taccuino (tasto I) raccoglie Prove e Parole.
2. Tre Parole-Chiave in qualsiasi ordine (Nicole, Leryn, Elisa ~25'), intrecciate con catena Erika/Martina/Moka e alibi Masia/Bea (~12').
3. Svegliare Davi (Maki) → sua "campagna" (5').
4. **Accusa** a Su Nuraghe (stile tribunale leggero): scegli colpevole + presenta 2 prove. Sbagliata → scena comica (Masia sbrocca, Bea si difende con il dominio), flag "pasticcio", si riprova. Mai bloccante.
5. Confessione → festa → Marco entra → Martina canta → **schermata auguri + codice** (5').

**Finali:** Perfetto (accusa giusta al primo colpo + 7 paperelle + costume), Buono, Pasticciato. Cambiano dettagli della festa e la battuta di Marco; tutti portano agli auguri e al codice.
**Segreto "Permalosometro":** scegliere "Mi offendo" 5 volte → Bullone riproduce un messaggio di Marco: "Lo sapevo che ti saresti offeso. Ti amo lo stesso."

## Architettura tecnica
```
index.html            canvas + bootstrap
src/main.js           loop, scene manager
src/engine/           input.js, renderer.js (256x192 interno, scala intera, pixel-perfect),
                      tilemap.js, entity.js (movimento a griglia interpolato), camera.js,
                      warp.js (porte/interni), audio.js (WebAudio chiptune sintetizzato, nessun file)
src/game/             state.js (flag, inventario, prove, autosave localStorage),
                      dialogue.js (typewriter, scelte, condizioni, effetti), ui.js (box, taccuino, menu),
                      hints.js (Bullone), crypto.js (WebCrypto PBKDF2+AES-GCM), ending.js
src/puzzles/          cipher.js, combo.js, sokoban.js, rps.js, accusation.js
data/maps/*.json      tile come righe di caratteri + legenda, NPC, porte, trigger
data/dialogues/*.json un file per personaggio: nodi {speaker, text, choices[], if, do}
data/sprites.json     sprite come griglie di caratteri + palette (animazioni 4 direzioni × 2-3 frame)
data/story.json       flag, oggetti/prove, aiuti per fase, finali
data/secret.json      {salt, iv, ciphertext} del codice
tools/encrypt-code.mjs  node tools/encrypt-code.mjs <CODICE>  → scrive data/secret.json (codice mai salvato in chiaro)
tools/validate-data.mjs controlla JSON: goto inesistenti, flag non definiti, warp rotti, sprite mancanti
tests/*.test.mjs      node:test su logica pura (condizioni dialogo, crypto roundtrip, validatori puzzle)
```
- **Premio protetto:** il link Lockee è cifrato in `data/secret.json` (lo script lo riceve come argomento e non lo salva mai in chiaro; nessun file di testo con il link nel repo). Chiave = PBKDF2(3 Parole-Chiave + nome colpevole). Protegge da "visualizza sorgente"/grep; chi reverse-ingegnerizza gli enigmi dai JSON potrebbe ricostruirlo (accettabile per un regalo).
- **Debug:** `?debug=1` → teletrasporto, set flag, salta dialoghi; indispensabile per testare un gioco da un'ora.
- **GitHub Pages:** repo pubblico `themarkk/kiril-birthday` (Pages gratis); Kiril potrebbe trovarlo solo cercandolo. Sul Mac non ci sono `gh` né chiavi SSH: alla Tappa 3 installo `gh` (Homebrew) e **Marco fa una volta `gh auth login`** (inserimento credenziali: lo fa lui); poi creo repo, push e attivo Pages da CLI. Alternativa se qualcosa si blocca: Netlify drop.
- **Strumenti di lavoro:** skill Superpowers (writing-plans, subagent-driven-development, TDD sui moduli logici, verification-before-completion), browser integrato / Playwright per playtest con screenshot. Nessun plugin aggiuntivo necessario.

## Piano a tappe (commit a ogni tappa funzionante)
0. **Setup** — dopo l'approvazione: skill `superpowers:writing-plans` per il piano dettagliato per task; `git init`, spec in `docs/superpowers/specs/2026-10-31-kiril-birthday-design.md`, README (come modificare i JSON), `.gitignore`, server locale (`python3 -m http.server`) in `.claude/launch.json`.
1. **Cammina nel paese** — canvas pixel-perfect, mappa da JSON con tile provvisori, Kiril a griglia, collisioni, camera. *Giocabile: esplori.*
2. **Parla ed entra** — motore dialoghi (typewriter, scelte, flag), NPC da JSON, porte/interni, autosave. *Giocabile: parli e scegli.*
3. **Scheletro completo** — tutti i PNG con dialoghi essenziali, catena di flag completa, accusa semplice, finali, auguri, crypto + script codice, validatore, test, Taccuino, Bullone base. **Primo deploy su GitHub Pages.** *Giocabile dall'inizio alla fine (~5').*
4. **Pixel art** — tileset paese + interni, 13 sprite personaggi riconoscibili con camminata, schermata titolo.
5. **Enigmi 1** — biglietto di Marco, cifrario di Nicole, morra di Masia, enigma d'umore di Maki.
6. **Enigmi 2** — combo di Leryn, sokoban di Elisa, catena costume Erika/Martina/Moka (cambio sprite), sveglia Davi, accusa con prove.
7. **Dialoghi pieni** — tutte le voci al massimo, gag bulgare, "Mi offendo", paperelle, varianti dei finali, Permalosometro, aiuti di Bullone per ogni fase.
8. **Atmosfera** — musica e suoni chiptune, transizioni, jingle scoperta, finale animato con coriandoli.
9. **Playtest e consegna** — partita completa cronometrata via browser, bilanciamento aiuti, validatore verde, deploy finale. Il link vero viene cifrato già alla Tappa 3 (niente passi manuali la mattina).

**Ordine di sacrificio se il tempo stringe** (dopo la Tappa 3, sempre giocabile): prima si taglia l'atmosfera audio (8), poi il Permalosometro e le paperelle, poi la semplificazione di un enigma (sokoban → dialogo). Mai tagliati: accusa, finale, auguri, premio.
**Tempi indicativi:** Tappe 0–3 entro ~4 h; 4 entro ~7 h; 5–7 entro ~13 h; 8–9 entro ~16 h; margine fino alle 8:00 per i ritocchi di Marco ai testi.

## Verifica
- `node --test tests/` verde; `node tools/validate-data.mjs` senza errori.
- A ogni tappa: server locale + browser integrato, screenshot e partita guidata (Playwright) del percorso critico.
- Tappa 9: partita completa dall'inizio alla fine senza debug; prova dei 3 finali via `?debug=1`; decifratura del codice corretta solo con accusa giusta; ricarica pagina a metà → progressi conservati.
- Deploy: aprire l'URL GitHub Pages in finestra pulita e completare l'apertura del gioco.

## Lasciato al builder
Layout preciso della mappa, palette, testi specifici dei dialoghi (nel rispetto delle voci sopra), parametri degli enigmi, melodie.
