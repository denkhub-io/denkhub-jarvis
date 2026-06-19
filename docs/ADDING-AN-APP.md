# Creare un'app

Un'app di DenkHub Jarvis e un singolo oggetto passato a `Jarvis.registerApp`.
Nessun build, un file solo.

## I tre passi

1. Copia `apps/hello-world.js` in `apps/la-tua-app.js`.
2. Cambia `id`, `name`, `icon`, `defaultSize` e scrivi `mount(body, api)`.
3. Aggiungi `<script src="apps/la-tua-app.js"></script>` in `index.html` prima
   di `js/app.js`.

L'app comparira nel dock, si aprira con un dwell o un pinch (o un clic del
mouse) e si montera in una finestra con la sua `api`.

## Il manifest

```js
Jarvis.registerApp({
  id: 'la-tua-app',          // obbligatorio, unico, minuscolo, senza spazi
  name: 'La tua app',        // obbligatorio, mostrato nel dock e nella titlebar
  icon: '<svg ...>...</svg>', // obbligatorio, SVG inline con stroke="currentColor"
  defaultSize: { width: 320, height: 240 }, // obbligatorio
  showInDock: true,          // opzionale, default true
  allowMultiple: true,       // opzionale, default true. false = una finestra sola

  mount(body, api) {
    // Costruisci la UI dentro body. Ritorna una funzione di pulizia.
    return () => { /* ferma timer e listener */ };
  }
});
```

`mount` riceve il corpo vuoto della finestra e l'oggetto `api`. Se avvii timer
o listener, ritorna una funzione che li ferma: viene chiamata alla chiusura.
Usa una closure per lo stato, cosi due finestre della stessa app non si
calpestano.

## L'oggetto api

| Campo | Cosa fa |
|---|---|
| `api.storage` | Storage namespaced per la tua app: `get(k, fallback)`, `set(k, v)`, `remove(k)`, `keys()`. Salva in `localStorage`. |
| `api.window` | `setTitle`, `close`, `minimize`, `focus`, `resize`, `getEl` della tua finestra |
| `api.notify(msg, opts)` | Mostra un toast |
| `api.ai` | `hasKey()` e `async chat(messages, { system, model, maxTokens })` verso OpenAI |
| `api.settings` | Impostazioni condivise: `get`, `set` |
| `api.theme` | Token di brand: `accent`, `bg`, `text`, `radius`, `token(name)` |
| `api.createWindow(appId, opts)` | Apre la finestra di un'altra app |
| `api.postMessage(appId, topic, payload)` | Invia un messaggio a un'altra app (la riceve in `onMessage`) |

## Esempio minimo

```js
Jarvis.registerApp({
  id: 'saluto',
  name: 'Saluto',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg>`,
  defaultSize: { width: 280, height: 160 },
  mount(body, api) {
    body.style.padding = '16px';
    body.textContent = 'Ciao da ' + api.appId;
  }
});
```

## Errori comuni

- Dimenticare di chiamare `Jarvis.registerApp`: l'app non compare.
- Dimenticare la riga `<script>` in `index.html`.
- Aprire da `file://`: la webcam non parte, serve un server http.
- Target troppo piccoli: i pulsanti vanno tenuti grandi per i gesti.
- Mettere segreti nel codice: la chiave OpenAI va nel `localStorage`, mai nel repo.
- Non ritornare la pulizia da `mount`: i timer restano attivi dopo la chiusura.

## Come diventa interattiva a mano

Il window manager registra automaticamente i pulsanti e gli input della tua app
in `InteractiveRegistry`, quindi sono raggiungibili dai gesti senza codice extra.
I pulsanti rispondono a select e dwell-click, gli input aprono la tastiera a
schermo. Usa elementi standard (`button`, `input`, `textarea`, `[contenteditable]`).
