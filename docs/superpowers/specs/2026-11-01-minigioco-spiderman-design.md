# Minigioco di Spider-Man sulla Switch: design

## Perché
Uno sfizio in più nel regalo per Kiril: in casa c'è una Switch vicino alla TV, e accendendola si gioca a un piccolo platformer in cui si oscilla con le ragnatele. Non serve alla storia, serve a far divertire e ridere.

## Deciso da Marco
- Spider-Man e Nintendo Switch veri, con riferimenti alla storia originale di Spider-Man. È un'eccezione voluta alla regola di `CLAUDE.md` e vale solo per questo minigioco.
- Solo uno sfizio: non influenza indagine, prove o finali.
- Non si cambia ciò che esiste già: si aggiunge soltanto.
- Solo tastiera, niente telefono.
- Nella schermata iniziale si sceglie tra Spider-Man e Kiril.
- Si oscilla con le ragnatele superando ostacoli da un lato all'altro dello schermo.
- Il minigioco sta dentro il gioco, non in una pagina separata.

## Approcci considerati
1. **Scena dentro il gioco (scelto da Marco).** Si apre con il meccanismo dei minigiochi esistenti (nodo `puzzle` del dialogo). Niente caricamenti, stessi tasti e audio, si torna davanti alla Switch. In cambio condivide il codice con il gioco e richiede poche aggiunte ai file esistenti.
2. **Pagina separata.** Isolamento massimo, ma si esce dal gioco e tastiera e audio vanno rifatti o collegati a parte.

Le mappe viste dall'alto sono state scartate: non permettono di oscillare in vista laterale.

## Proposte di Claude (da correggere se non vanno)

**Come ci si arriva**
- Nuova tile `switch` (solida) in casella (10,4) di `house.json`, subito sotto la TV. La casella (10,3) resta libera perché è l'unico punto da cui si può usare la TV.
- Nuovo nodo in `data/dialogues/objects.json`: una riga di testo, poi il minigioco. Il testo della TV resta com'è. La Switch è disponibile in qualsiasi momento della storia.

**Schermata iniziale**
- Titolo, i due personaggi affiancati. ←→ sceglie, Z conferma, X torna in casa.
- I due personaggi hanno la stessa fisica: cambiano aspetto e battute, così nessuno dei due è la scelta sbagliata. Kiril è in borghese e spara ragnatele senza spiegazioni.

**Come si gioca**
- Vista laterale sui tetti di New York, in 5 schermate fisse senza scorrimento: si parte da sinistra, si raggiunge il bordo destro e si passa alla successiva.
- ←→ cammina e dà spinta, ↑ salta. Tenendo premuto Z la ragnatela si attacca al punto di aggancio più vicino, evidenziato in anticipo; rilasciando si vola via con lo slancio. X esce.
- Progressione: 1) tetti vicini per imparare, 2) vuoto largo, 3) muro alto da scavalcare, 4) bombe zucca di Goblin in movimento, 5) schermata finale che unisce tutto.
- Niente vite, timer o game over: chi cade o viene colpito riparte dall'inizio della schermata. Durata circa 2-3 minuti.

**Riferimenti**
- Citazioni brevi scritte da noi, in italiano: zia May, zio Ben, Goblin, J. Jonah Jameson.
- Finale: prima pagina del Daily Bugle in cui Jameson accusa il personaggio scelto, con titolo diverso per Spider-Man e per Kiril.
- Tornati in casa, una battuta sulla Switch. Nessun oggetto, flag o effetto sul salvataggio.

**Grafica e audio**
- Sprite disegnati da zero come griglie di caratteri, come il resto del gioco: nessuna immagine presa da giochi esistenti.
- Kiril usa il suo sprite già pronto. Il costume da ragno di Erika resta separato.
- Durante il minigioco suona la musica `arcade` già esistente, poi torna `house`. Effetti con i suoni già presenti.

**Codice**
- `src/puzzles/swing.js`: fisica pura (corda a pendolo, collisioni, cadute), provata con test in `tests/`.
- `src/puzzles/swing-scene.js`: disegno e tasti. La scena non è un overlay, quindi copre la casa. Ha `debugSolve` come gli altri minigiochi.
- Schermate in un nuovo file di dati.
- Aggiunte minime ai file esistenti: una riga di registrazione, tile, oggetto e dialogo.
- Una riga in `CLAUDE.md` con l'eccezione alla regola e il nuovo minigioco.

## Vincoli da verificare
- Un salvataggio in cui Kiril si trova proprio in (10,4) non deve restare bloccato dentro la nuova tile solida.
- La scena deve poter uscire in qualsiasi momento e far tornare musica e dialogo come prima.
- `npm test` verde e `npm run validate` a 0 errori prima di pubblicare, più una prova vera nel browser fino in fondo.
- Il sito si aggiorna a ogni push: si pubblica solo quando Marco lo chiede.

## Fuori da questo lavoro
- Comandi touch, classifiche, ricompense, collegamenti con la storia.
- Abilità diverse per i due personaggi.
- Musica nuova.

## Lasciato a chi costruisce
Valori della fisica, disposizione esatta delle schermate, testi delle battute e pose di oscillazione, purché il gioco resti facile da finire e divertente al primo tentativo.
