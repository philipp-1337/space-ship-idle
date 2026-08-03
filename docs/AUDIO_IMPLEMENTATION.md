# Audio Implementierungskonzept: Space Ship Idle

Dieses Dokument beschreibt die Architektur und den Plan zur Integration von Soundeffekten in das Spiel.

## 1. Technologiestack

- **Library:** [Howler.js](https://howlerjs.com/)
- **Begründung:** Nutzt die moderne Web Audio API, bietet automatisches Caching, perfektes Handling von multiplen gleichzeitigen Sounds und löst gängige Browser-Restriktionen (z.B. Autoplay-Policies) elegant.

## 2. Architektur: Der `AudioManager` (Singleton)

Um zu verhindern, dass Audio-Logik im gesamten Code verstreut ist, wird ein zentraler `AudioManager` (als ES6-Modul oder Singleton-Klasse) implementiert. Keine UI-Komponente oder Spiellogik interagiert direkt mit Howler.js oder der HTML5 Audio API.

### 2.1 Konfiguration (`src/audio/audioConfig.js`)

Alle verfügbaren Sounds werden in einer zentralen Konfigurationsdatei registriert.

```javascript
export const SOUNDS = {
  // UI
  UI_CLICK: '/assets/audio/sfx/ui_click.wav',
  UI_HOVER: '/assets/audio/sfx/ui_hover.wav',
  UI_UPGRADE: '/assets/audio/sfx/ui_upgrade.wav',
  UI_ERROR: '/assets/audio/sfx/ui_error.wav',
  
  // Action
  SHIP_LASER: '/assets/audio/sfx/ship_laser.wav',
  ENEMY_HIT: '/assets/audio/sfx/enemy_hit.wav',
  ENEMY_EXPLODE: '/assets/audio/sfx/enemy_explode.wav',
  SHIP_HIT: '/assets/audio/sfx/ship_hit.wav',
  
  // Idle & Resources
  RES_COLLECT: '/assets/audio/sfx/res_collect.wav',
  MILESTONE: '/assets/audio/sfx/milestone_reached.wav',
};
```

### 2.2 Der Manager (`src/audio/AudioManager.js`)

Der Manager kapselt die Funktionalität.

- **Preloading:** Beim Start der Applikation werden alle definierten Sounds via Howler vorgeladen, um Verzögerungen im Spiel zu vermeiden.
- **Volume Control:** Getrennte Steuerung für Master-Volume, SFX und eventuell Musik.
- **Mute-State:** Globale Stummschaltung (wird persistiert, z.B. im LocalStorage).
- **Rate Limiting (Wichtig für Idle Games):** Wenn im Lategame 50 Schüsse pro Sekunde abgefeuert werden, darf der `SHIP_LASER`-Sound nicht 50-mal pro Sekunde neu gestartet werden (Audio-Clipping/Lärm). Der Manager implementiert ein Throttling (z.B. max. 10 Laser-Sounds pro Sekunde zulassen).

## 3. Implementierungs-Schritte

### Schritt 1: Abhängigkeiten installieren

```bash
npm install howler
```

### Schritt 2: Manager & Config anlegen

Die Dateien `audioConfig.js` und `AudioManager.js` werden implementiert. Der Manager instanziiert für jeden Eintrag in der Config ein `Howl`-Objekt.

**Skizze AudioManager.js:**

```javascript
import { Howl, Howler } from 'howler';
import { SOUNDS } from './audioConfig';

class AudioService {
  constructor() {
    this.sounds = {};
    this.isMuted = false;
    this.lastPlayed = {}; // Für Throttling
  }

  init() {
    // Initialisiert alle Howl-Instanzen
    for (const [key, path] of Object.entries(SOUNDS)) {
      this.sounds[key] = new Howl({ src: [path], volume: 0.5 });
    }
    
    // Mute-State aus LocalStorage laden
    const savedMute = localStorage.getItem('audio_muted');
    if (savedMute === 'true') this.toggleMute(true);
  }

  play(soundKey) {
    if (this.isMuted || !this.sounds[soundKey]) return;
    
    // Einfaches Throttling (z.B. max alle 50ms den gleichen Sound)
    const now = Date.now();
    if (this.lastPlayed[soundKey] && (now - this.lastPlayed[soundKey] < 50)) {
      return; 
    }
    
    this.sounds[soundKey].play();
    this.lastPlayed[soundKey] = now;
  }

  toggleMute(forceState) {
    this.isMuted = forceState !== undefined ? forceState : !this.isMuted;
    Howler.mute(this.isMuted);
    localStorage.setItem('audio_muted', this.isMuted);
  }
}

export const AudioManager = new AudioService();
```

### Schritt 3: Bootstrapping

In der Hauptdatei (z.B. `main.js` oder `App.vue`/`App.jsx`) wird `AudioManager.init()` einmalig beim App-Start aufgerufen.

### Schritt 4: UI-Integration (Settings)

Einbauen eines Mute-Buttons in der Navigation/Settings-UI, der `AudioManager.toggleMute()` aufruft. Der Button muss visuell auf den aktuellen Mute-State reagieren.

### Schritt 5: Integration in die Spiellogik

Überall im Code, wo ein auditives Feedback nötig ist, wird der Manager importiert und aufgerufen:

```javascript
import { AudioManager } from '@/audio/AudioManager';

// ... bei Klick auf Upgrade
AudioManager.play('UI_UPGRADE');

// ... wenn das Schiff schießt
AudioManager.play('SHIP_LASER');
```

## 4. Zukünftige Erweiterungen

- **Audio-Sprites:** Falls die Anzahl der Dateien zu groß wird, können alle Sounds in einer einzigen Datei (Audio-Sprite) gebündelt werden. Howler.js unterstützt das nativ.

- **Background Music (BGM):** Erweitern des Managers um Funktionen wie `playMusic()` und `stopMusic()` mit sanftem Ein- und Ausblenden (Crossfading/Fading).
