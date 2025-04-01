# Project Progress

## Sprint 1: Core Gameplay Loop

### Goals
- [x] Basic Asset Loading (Placeholders & GLTF)
- [x] Physics World Setup (Ground, Tower)
- [x] Player Camera & Input Handling
- [x] Bow Drawing Mechanic
- [x] Arrow Shooting (Physics-based)
- [x] Basic Enemy Spawning (Wave 1)
- [x] Enemy Movement AI (Towards Tower) - *Existing logic in Enemy.js update()*
- [x] Arrow-Enemy Collision Detection & Damage - *Existing logic in Bow.js/Enemy.js*
- [x] Enemy-Tower Collision & Damage - *Existing logic in Enemy.js/EnemyManager.js (range-based attack)*
- [x] Basic UI (Health, Score, Wave) - *Existing logic in Game.js/UIManager.js*

### Current Status
- Core modules (Physics, Renderer, AssetLoader, Bow, EnemyManager, Enemy) are implemented with basic functionality.
- Placeholders are generated correctly for missing assets.
- Bow can be drawn and arrows are shot with physics applied.
- Enemies spawn based on wave definitions.
- Physics shapes for enemies reverted to Box shapes (matching placeholder visual height) due to runtime errors with Capsule.
- Enemy spawn Y-position adjusted based on Box shape half-height.
- **Verified Core Loop:** Collision logic (arrow-enemy, enemy-tower), enemy AI (movement, attack), and UI updates (health, score, wave) confirmed functional through testing (Sprint 1 verification).

### Known Issues / Next Steps (Sprint 1 Remaining)
- [x] **Physics Shape Validation:** Confirmed GLTF models are handled. `EnemyManager` now calculates bounding boxes for loaded GLTF models (after applying scaling defined in `waveDefinitions`) and creates appropriate `CANNON.Box` shapes. `Enemy.js` applies the scaling to the visual mesh. Placeholder shapes are still used if a model isn't loaded.
- **Audio Integration:** Ensure all sounds defined in `AssetLoader` are triggered correctly by `AudioManager`.
- [x] **Improve Arrow Placeholder:** Enhanced the visual placeholder for arrows to include distinct parts (shaft, head, fletching).
- [x] **Add Quiver Decoration:** Added a placeholder quiver with decorative arrows near the player start position.
- [x] **Add Physics to Quiver/Arrows:** Implemented physics bodies for the decorative quiver and arrows. `Game.js` positions arrows relative to the frozen quiver body. `Physics.js` handles body creation and freezing.


## Sprint 2: Improvements & Bug Fixes

### Goals
- [x] **Improve Tower Physics:** Adjust the tower's physics box to more accurately match its visual model. (Done: Manual dimensions in Physics.js adjusted by user for correct fit)
- [x] **Improve Enemy Physics:** Ensure enemy physics boxes cover the entire model height, not just the lower part. (Done: Physics body centered, mesh offset vertically in Enemy.js - requires testing)
- [x] **Implement Arrow Cooldown:** Add a cooldown mechanism to prevent arrow spamming. (Done: 0.5s cooldown added in Bow.js)
- [x] **Clean Up UI:** Remove unused elements (Resources, Player Health, Upgrade button/text) from the UI. (Done: Removed from index.html and UIManager.js)
- [x] **Increase Enemy Speed:** Make enemies move 20% faster. (Done: Updated waveDefinitions in EnemyManager.js)
- [ ] **Audio Integration:** Ensure all sounds defined in `AssetLoader` are triggered correctly by `AudioManager`. (Moved from Sprint 1)

### Current Status
- Sprint 2 improvements implemented. Ready for testing or next task (Audio Integration).

### Known Issues / Next Steps
- Address goals listed above.


## Sprint 3: UI & Polish

### Goals
- [x] **Add Title UI:** Add "Paumier.works game skunkworks" title with emojis (skunk, race car) to top-middle UI. (Done: Added div in index.html and CSS)
- [x] **Remove Physics Debugger:** Remove Cannon-es debugger wireframes. (Done: Commented out in Physics.js)
- [x] **Add Vibe Jam Link:** Integrate provided HTML link snippet into index.html. (Done)
- [ ] **Audio Integration:** Ensure all sounds defined in `AssetLoader` are triggered correctly by `AudioManager`. (Moved from Sprint 1)

### Current Status
- Sprint 3 UI/Polish tasks completed. Ready for Audio Integration or further tasks.

### Known Issues / Next Steps
- Address goals listed above.
