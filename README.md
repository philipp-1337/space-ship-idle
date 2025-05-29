# Folder structure

- `src` - source code for your kaplay project
  - `main.js` - entry point of the game, initializes the game and handles user input
  - `ship.js` - represents the player's spaceship, includes movement and shooting methods
  - `enemy.js` - represents the enemies, includes spawning and collision detection
  - `laser.js` - represents the lasers shot by the spaceship, includes movement and collision detection
  - `xp.js` - represents experience points dropped by destroyed enemies, includes spawning and collection methods
  - `ui.js` - functions for updating the user interface, including experience bar and level information

- `public` - contains static assets for the game
  - `examples/` - example assets
  - `fonts/` - font files
  - `shaders/` - shader files
  - `sounds/` - sound files
  - `sprites/` - sprite images

- `index.html` - main HTML file that loads the game
- `package.json` - configuration file for npm, lists dependencies and scripts
- `vite.config.js` - configuration file for Vite, specifies server settings and build options
- `.gitignore` - specifies files and directories to ignore in Git
- `README.md` - documentation for the project, including instructions for development and distribution

## Development

To start the development server, run:

```sh
$ npm run dev
```

This will start a dev server at http://localhost:3001.

## Distribution

To build the project for distribution, run:

```sh
$ npm run build
```

This will compile the JavaScript files into the `dist/` folder.

To package the game into a .zip file, run:

```sh
$ npm run zip
```

This will create a zip file in the `dist/` folder that you can upload to your server or platforms like itch.io or Newgrounds.