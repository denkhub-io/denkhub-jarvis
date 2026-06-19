# Gesti

Il controllo di DenkHub Jarvis e pensato per le mani. Il cursore segue il
centro del palmo, non il pollice, cosi resta fermo mentre pizzichi. Tutte le
soglie qui sotto stanno in `js/config.js` e si possono regolare dal vivo da
Impostazioni > Gesti.

## Vocabolario

| Gesto | Stato | Azione |
|---|---|---|
| Mano aperta | `open` | Muovi il cursore |
| Punta e attendi | `open` + dwell | Clicca quando l'anello si riempie |
| Pinch (pollice e indice) | `pinch` | Seleziona, un clic esplicito |
| Pinch e tieni | `grab` | Trascina, ridimensiona, scorri |
| Pugno | `fist` | Nessuna azione da solo |
| Doppio pugno (due mani) | | Chiudi tutto, torna alla home |
| Doppio pinch (una mano) | | Riapri l'ultima app |
| Doppio clap (voce, microfono) | | Apri le app scelte in griglia |

## Come funziona il cursore

- La posizione viene dal centro del palmo, media dei landmark MediaPipe
  0, 5, 9, 13, 17.
- Il segnale e filtrato con un filtro One Euro: liscia molto quando la mano e
  ferma, poco quando si muove veloce.
- All'inizio di un pinch il cursore viene congelato per un istante
  (`pinchFreezeMs`, 140 ms) cosi un pinch non sposta il puntatore.

## Dwell click

Punta un target e tieni fermo. Un anello si riempie e al completamento parte
il clic.

| Parametro | Valore | Significato |
|---|---|---|
| `dwellMs` | 650 | Tempo sul target prima del clic |
| `dwellMoveTolerancePx` | 26 | Oltre questo spostamento il dwell riparte |
| `dwellCooldownMs` | 500 | Pausa dopo un clic per evitare ripetizioni |

## Pinch e grab

La distanza pinch e 2D tra pollice (4) e indice (8), normalizzata sulla
dimensione della mano, quindi funziona a qualsiasi distanza dalla camera.

| Parametro | Valore | Significato |
|---|---|---|
| `pinchEnter` | 0.045 | Sotto questo rapporto inizia il pinch |
| `pinchExit` | 0.075 | Sopra questo rapporto finisce. La banda tra i due evita lo sfarfallio |
| `pinchDebounceMs` | 120 | Durata minima perche un pinch conti |
| `grabHoldMs` | 350 | Pinch tenuto oltre questo tempo diventa grab (trascina) |

## Assistenza alla mira

| Parametro | Valore | Significato |
|---|---|---|
| `hitInflatePx` | 12 | Ogni target e ingrandito di 12 px per lato per i gesti |
| `snapRadiusPx` | 140 | Lo snap considera i target entro questo raggio |
| `snapStrength` | 0.6 | Il cursore e attratto fino al 60% verso il target piu vicino |

## Architettura dell'input

La pipeline mani in `js/hands.js` non comanda la UI: emette stati e cursore
all'`InputRouter`, che produce intenti di alto livello (hover, dwell-click,
select, drag, scroll). Gli elementi interattivi si registrano in
`InteractiveRegistry` e ricevono gli intenti tramite `onIntent`. Il mouse passa
dallo stesso router e produce gli stessi intenti, quindi la UI e identica con
mano o mouse.
