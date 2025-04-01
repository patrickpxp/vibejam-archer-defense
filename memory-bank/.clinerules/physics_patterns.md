# Physics Rules & Patterns

## 1. World Setup
- Gravity: `(0, -9.82, 0)`
- Time Step: `1/60`
- Broadphase: `NaiveBroadphase` (Consider `SAPBroadphase` for more objects)
- Solver Iterations: Default (currently 10 in cannon-es)

## 2. Materials & Contacts
- Defined Materials: `ground`, `player` (used for tower), `enemy`, `arrow`.
- Access materials via `physicsWorld.getMaterial('materialName')`.
- Key Contact Properties:
    - `ground` vs `enemy`: friction=0.4, restitution=0.1
    - `ground` vs `arrow`: friction=0.1, restitution=0.4 (allows sticking/slight bounce)
    - `enemy` vs `arrow`: friction=0, restitution=0 (collision handled purely by events)
    - `player`/`tower` vs `enemy`: friction=0.2, restitution=0

## 3. Body Creation & Linking
- **Static Bodies:** Ground (`Plane`), Tower (`Cylinder`) created in `Physics.init()`. Mass = 0.
- **Dynamic Bodies:**
    - **Arrow:** `CANNON.Box` shape derived from scaled mesh bounds in `Bow.js`. Mass = 0.1. `angularDamping=0.4`, `linearDamping=0.01`.
    - **Enemy:** `CANNON.Box` shape defined in `EnemyManager.js` matching placeholder visual height. Mass = 5. `fixedRotation=true`, `linearDamping=0.5`. (Reverted from Capsule).
- **Linking:**
    - `body.userData = { mesh: threeMesh, type: 'typeName', instance: this }` (Store mesh ref, type string, and optionally the class instance).
    - `mesh.userData = { body: cannonBody }` (Store body ref).

## 4. Collision Handling Strategy
- Use `body.addEventListener('collide', callback)` for dynamic bodies.
- **Arrow Collisions (`Bow.js`):**
    - Check `event.body.userData.type`.
    - If 'enemy', call `enemyInstance.takeDamage()`. Remove arrow.
    - If static (mass=0), call `stickArrow()` (sets body to static, removes listener).
    - Otherwise, remove arrow.
- **Enemy Collisions (`Enemy.js`):**
    - Primarily used for non-attack interactions (e.g., obstacles).
    - Tower attacks are handled by range check in `Enemy.update()`, calling `EnemyManager.handleTowerHit()`.

## 5. Body Removal
- **CRITICAL:** Always remove the physics body (`physicsWorld.removeBody(body)`) *before* removing the Three.js mesh (`scene.remove(mesh)`).
- Call `body.removeEventListener('collide', listener)` before removing the body if the listener was stored. (cannon-es might handle this internally on `removeBody`, but explicit removal is safer).
- Dispose of mesh geometry/material after removal (`mesh.geometry.dispose()`, `mesh.material.dispose()`).

## 6. Spawn Positioning
- Enemy spawn Y position must be calculated based on the physics shape's height to ensure correct ground placement.
- For Boxes: `spawnY = shape.halfExtents.y`.
