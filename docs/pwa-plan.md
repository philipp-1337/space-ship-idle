# Plan: PWA + „Update verfügbar"-Toast

Kontext: Vite 8, keine Runtime-Dependencies (nur Vite als devDependency),
Deploy über Firebase Hosting aus `dist/`, `base: "./"` in `vite.config.js`.
Aktuell kein Manifest, kein Service Worker.

Die laufende Flug-Persistenz (`src/runState.js`, siehe Commit
`c52047e`) speichert Level/XP/Upgrades/Hülle in `localStorage` und
überlebt einen normalen Reload. Der Update-Toast unten baut bewusst
darauf auf, statt eigene Sonderlogik zu brauchen.

## 1. Grundsatzentscheidung: hand-geschriebener SW vs. `vite-plugin-pwa`

Zwei Wege:

- **`vite-plugin-pwa`** (empfohlen): generiert Manifest + Service Worker
  automatisch, übernimmt Precaching mit korrektem Cache-Busting
  (Workbox unter der Haube), Update-Erkennung kommt als fertiger Hook
  (`registerSW` mit `onNeedRefresh`-Callback). Kostet eine neue
  devDependency.
- **Handgeschriebener `sw.js`**: passt zur Null-Dependency-Philosophie,
  aber Cache-Invalidierung bei jedem Deploy muss man sich selbst
  korrekt bauen (Versionierung, `skipWaiting`, alte Caches löschen) —
  leicht subtile Bugs (Spieler bleiben auf altem Build hängen).

**Empfehlung:** `vite-plugin-pwa`, weil Cache-Invalidierung genau die
Art Bug ist, die man nicht selbst debuggen möchte. Eine Dependency
dafür ist es wert.

> Offene Entscheidung: Passt diese Empfehlung, oder soll komplett
> handgerollt (Null-Dependencies) geplant/umgesetzt werden? Das ist der
> einzige Punkt, der die Umsetzung strukturell verändert — der Rest
> (Manifest, Icons, Toast-UI, Zusammenspiel mit der Run-Persistenz)
> bleibt so oder so gleich.

## 2. Web App Manifest

- `public/manifest.webmanifest`: `name`, `short_name`,
  `theme_color`/`background_color` passend zum HUD (near-black
  gunmetal, phosphor-green Akzent aus dem bestehenden Design),
  `display: "standalone"`, `orientation` offenlassen (Spiel läuft
  sowohl mobil als auch Desktop).
- **Icons fehlen aktuell komplett** — `public/sprites` etc. sind in
  diesem Checkout nur Platzhalter-Textdateien, es gibt keine echten
  Bild-Assets im Repo. Für die PWA braucht es mindestens ein
  512×512- und ein 192×192-Icon (plus maskable-Variante für Android).
  Vorschlag: aus dem Pixel-Art-Schiffssprite (`src/ship.js`) ein Icon
  ableiten, passend zum bestehenden HUD-Look.
- `<link rel="manifest">` + `theme-color`-Meta in `index.html`
  ergänzen.

## 3. Service Worker / Caching-Strategie

- Precache der Build-Assets (JS-Bundle, Fonts, ggf. `index.html`) über
  `vite-plugin-pwa` im `injectManifest`- oder einfacheren
  `generateSW`-Modus.
- Strategie: **Cache-first mit Revisionierung** für gehashte
  Vite-Assets (ändern sich eh bei jedem Build, brauchen keine
  Netzwerk-Prüfung), **Network-first für `index.html`** (immer die
  aktuelle Einstiegsseite holen, damit neue Asset-Referenzen ankommen).
- Externe Font-Requests (`fonts.googleapis.com`/`fonts.gstatic.com` in
  `index.html`) bewusst NICHT ins Precaching aufnehmen oder mit
  Stale-while-revalidate behandeln — offline soll das Spiel trotzdem
  starten, auch wenn die Google-Font dann fehlt (Fallback-Font).
- `registerType: "prompt"` (nicht `autoUpdate`) bei `vite-plugin-pwa`
  setzen — genau das ist der Hook für den Toast unten. Bei
  `autoUpdate` würde der SW im Hintergrund updaten und der Spieler
  bekäme mitten im Run einen anderen Code-Stand unter (riskant, gerade
  weil jetzt laufender Fortschritt im Tab gehalten wird).

## 4. Update-Prompt-Toast

- `virtual:pwa-register` liefert `onNeedRefresh()` /
  `onOfflineReady()` Callbacks.
- Neue UI-Funktion in `src/ui.js` im bestehenden HUD-Stil
  (Cockpit-Panel-Ästhetik, siehe `consolePanelModal`/`consoleButton`,
  die es schon gibt) — ein kleines Toast unten/oben mit "Update
  verfügbar" + Button "Jetzt neu laden".
- **Wichtig, verzahnt mit der Run-Persistenz:** der Toast darf NICHT
  automatisch neu laden. Der Spieler klickt bewusst, und der Reload
  läuft über den ganz normalen Pfad — die bestehende
  `saveRunState`/Restore-Logik greift automatisch, der laufende Flug
  bleibt also beim Update-Reload erhalten. Kein Sondercode nötig, das
  spielt sauber zusammen.
- Toast bleibt bestehen (kein Auto-Dismiss) bis geklickt oder das
  Level-Up-Shop-Modal/Pause-Menü offen ist — dann kurz zurückhalten, um
  nicht über anderen Dialogen zu erscheinen (gleiche Sorgfalt wie bei
  `isShopOpenRef`-Checks, die es im Code schon an mehreren Stellen
  gibt).

## 5. Build/Deploy-Integration

- `vite.config.js`: `VitePWA({...})` Plugin einhängen, `base: "./"`
  bleibt unverändert (funktioniert mit vite-plugin-pwa).
- `firebase.json`: Hosting-Header prüfen — `sw.js` und
  `manifest.webmanifest` müssen mit kurzem/keinem Cache ausgeliefert
  werden (sonst bekommt der Browser den neuen SW selbst nicht mit), die
  gehashten Assets dürfen weiter lang gecacht werden. Firebase Hosting
  setzt für Nicht-gehashte Dateien i. d. R. sinnvolle Defaults, sollte
  beim Umsetzen aber explizit gegengeprüft werden.
- `npm run zip` (bestehendes Skript, vermutlich für Store-Export)
  unberührt lassen, da unabhängig vom Web-Build.

## 6. Testing

- Lokal: `npm run build && npm run preview` (Vite-Preview-Server, damit
  der SW wie in Produktion registriert wird — im Dev-Server mit HMR
  verhält sich das anders/wird meist deaktiviert).
- Testfall „Update-Flow": Build A deployen, SW registrieren lassen,
  Build B deployen, Toast muss erscheinen, Klick lädt neu, laufender
  Flug bleibt (dank Run-Persistenz) erhalten.
- Testfall „Offline-Start": Flugmodus/Netzwerk aus, Seite trotzdem
  ladbar (bis auf ggf. fehlende Google-Font).
- Lighthouse-PWA-Audit als Abnahmekriterium (Installierbarkeit,
  Manifest-Validität).
