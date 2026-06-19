# Contribuire a DenkHub Jarvis

Grazie per l'interesse. Il progetto e pensato per essere facile da leggere e da
estendere.

## Regole di base

- Solo JavaScript puro. Niente build, niente framework, niente bundler.
- Niente commenti in stile AI, niente em-dash. Scrivi per chi arriva nuovo.
- Mouse e tastiera devono continuare a funzionare accanto ai gesti.
- Rispetta i token di brand in `denkhub-kit` (`var(--accent-color)`, le variabili
  di raggio e spaziatura).

## Avviare in locale

```bash
git clone https://github.com/denkhub-io/denkhub-jarvis.git
cd denkhub-jarvis
python3 -m http.server 8000
```

Apri `http://localhost:8000`. Serve un server http perche `getUserMedia` ha
bisogno di un contesto sicuro: `file://` non funziona.

## Struttura

- `js/` il kernel e i moduli core (registry, input, finestre, camera, hands, hud, clapper).
- `apps/` una app per file. La superficie estendibile.
- `css/desktop.css` lo stile del desktop.
- `denkhub-kit/` i token di brand.
- `docs/` le guide.

## Aggiungere un'app

Il contratto e una sola cosa: un oggetto passato a `Jarvis.registerApp`.

1. Copia `apps/hello-world.js` in `apps/la-tua-app.js`.
2. Cambia `id`, `name`, `icon`, `defaultSize` e scrivi `mount(body, api)`.
3. Aggiungi una riga `<script src="apps/la-tua-app.js"></script>` in `index.html`
   prima di `js/app.js`.

Niente altro file da toccare. Guida completa in
[docs/ADDING-AN-APP.md](docs/ADDING-AN-APP.md).

## Note sui gesti

- Tieni i target grandi. Le aree cliccabili devono essere generose.
- Le soglie sono in `js/config.js` e si regolano da Impostazioni.
- Dettagli e macchina a stati in [docs/GESTURES.md](docs/GESTURES.md).

## Inviare

- Crea un branch, una PR piccola e mirata, con uno screenshot o una GIF.
- Usa il template "New app idea" per proporre un'app prima di scriverla.
