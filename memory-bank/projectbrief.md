# Project Brief: Vibe Archer Game

## Project Vision
Develop a browser-based first-person archery game where the player defends a central tower against waves of incoming enemies.

## Core Requirements
- First-person perspective with bow and arrow mechanics.
- Physics-based arrow trajectory and collisions (using cannon-es).
- Wave-based enemy spawning system.
- Basic enemy AI (movement towards the tower, attacking).
- Asset loading for models (GLTF) and audio.
- Placeholder assets for development when models are missing.
- Basic UI for game state (wave, score, health).

## Technology Stack
- **Language:** JavaScript (ES Modules)
- **Graphics:** Three.js
- **Physics:** cannon-es
- **Audio:** Howler.js (inferred from AudioManager, paths in AssetLoader)
- **Environment:** Browser

## Key Modules
- `Game.js`: Main game loop orchestrator.
- `Renderer.js`: Handles Three.js scene setup and rendering.
- `Physics.js`: Manages cannon-es world, materials, and bodies.
- `AssetLoader.js`: Loads/generates game assets (models, audio paths).
- `AudioManager.js`: Manages sound playback using Howler.
- `InputManager.js`: Handles player input (mouse/keyboard).
- `Player.js`: Represents the player's state and camera position.
- `Bow.js`: Manages bow drawing, arrow creation, and shooting physics.
- `EnemyManager.js`: Controls enemy spawning, waves, and updates.
- `Enemy.js`: Defines individual enemy behavior and properties.
- `UIManager.js`: Updates HTML elements for game feedback.
- `Persistence.js`: (Likely for saving/loading game state - needs review).
