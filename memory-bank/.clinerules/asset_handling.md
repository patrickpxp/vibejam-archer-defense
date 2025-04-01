# Asset Handling Rules & Patterns

## 1. Asset Retrieval
- Always retrieve assets via `AssetLoader.getAsset(key)`.
- The returned object contains `{ scene: Object3D, isPlaceholder: boolean }` for models, or `{ src: string, type: 'audioPath' }` for audio.

## 2. Mandatory Cloning
- **CRITICAL:** Always clone the `scene` object from the asset data *before* adding it to the Three.js scene or using it for physics shape derivation.
  ```javascript
  const assetData = this.assets['some_key'];
  const meshInstance = assetData.scene.clone();
  // ... apply transformations, add to scene ...
  ```
- This prevents modifying the original template stored in `AssetLoader`.

## 3. Scaling Conventions
- **Placeholders:** Assumed to be correctly scaled within `AssetLoader.generatePlaceholder()`. Base should rest at Y=0.
- **Loaded GLTFs:**
    - **Arrow:** Scaled down by `0.1` in `Bow.js` *after* cloning. Physics shape derived from scaled bounds.
    - **Enemies (Goblin, Orc):** Currently assumed to be 1:1 scale (no scaling applied in `Enemy.js` or `EnemyManager.js`). Physics shapes match placeholder dimensions. **VALIDATE THIS ASSUMPTION** if using actual GLTF models.
    - **Bow:** Currently assumed 1:1 scale.
    - **Tower:** Currently assumed 1:1 scale.

## 4. Placeholder Geometry & Positioning
- **Enemies (Goblin, Orc):** Use `THREE.CapsuleGeometry`. Translated so the base rests at Y=0.
- **Arrow:** Uses `THREE.CylinderGeometry`. Rotated to point down the Z-axis (relative to its local space) for physics alignment.
- **Bow:** Uses `THREE.BoxGeometry`.

## 5. Error Handling
- `AssetLoader` catches individual load/generation errors. Check `assetData.failed` if necessary.
- Modules using assets should check if `assetData` or `assetData.scene` exists before proceeding. Fallback or error logging is required if assets are missing.
