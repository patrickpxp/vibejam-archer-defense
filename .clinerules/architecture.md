# Architecture Rules & Constraints

- **Module Separation:**
    - `Physics.js` MUST NOT contain any direct references to or dependencies on the Three.js library (`THREE.*`).
    - All interactions between physics bodies (CANNON.js) and visual meshes (Three.js) must be managed externally, typically within the `Game.js` orchestrator or specific component modules (like `Enemy.js`, `Bow.js`).
    - Data required by `Physics.js` that originates from Three.js objects (e.g., bounding box dimensions for shape creation) must be calculated in a module where Three.js *is* allowed (like `Game.js`) and passed as plain data (e.g., objects with x, y, z properties) to `Physics.js` methods or its `init` function.
