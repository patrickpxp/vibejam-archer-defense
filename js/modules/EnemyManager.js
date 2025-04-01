import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Enemy from './Enemy.js';

class EnemyManager {
    constructor(scene, physicsInstance, audioManager, assets, gameState, target) { // Changed physicsWorld to physicsInstance
        this.scene = scene;
        this.physicsInstance = physicsInstance; // Store the Physics class instance
        this.physicsWorld = physicsInstance.getWorld(); // Keep reference to CANNON.World if needed elsewhere
        this.audioManager = audioManager;
        this.assets = assets;
        this.gameState = gameState;
        this.target = target;

        this.enemies = [];
        this.waveDefinitions = [
            // Increased speed by 20% (multiplied by 1.2)
            { type: 'goblin', count: 5, spawnDelay: 2.0, health: 20, speed: 2 * 1.2, points: 10, resource: 1, attackDamage: 2, attackRate: 1.5, scale: 1.0 },
            { type: 'goblin', count: 8, spawnDelay: 1.5, health: 25, speed: 2.2 * 1.2, points: 12, resource: 1, attackDamage: 2, attackRate: 1.5, scale: 1.0 },
            { type: 'orc', count: 3, spawnDelay: 4.0, health: 80, speed: 1.5 * 1.2, points: 50, resource: 5, attackDamage: 10, attackRate: 2.5, scale: 1.0 }, // Assuming Orc model is also 1:1 for now
            { type: 'goblin', count: 12, spawnDelay: 1.0, health: 30, speed: 2.5 * 1.2, points: 15, resource: 2, attackDamage: 3, attackRate: 1.2, scale: 1.0 },
            { type: 'orc', count: 5, spawnDelay: 3.0, health: 90, speed: 1.6 * 1.2, points: 60, resource: 6, attackDamage: 12, attackRate: 2.3, scale: 1.0 },
        ];
        this.currentWaveIndex = -1;
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
        this._isSpawning = false;
        this.enemiesToRemove = []; // Queue for deferred removal

        this.enemyShapes = {
            'goblin': new CANNON.Box(new CANNON.Vec3(0.4, 0.75, 0.4)),
            'orc': new CANNON.Box(new CANNON.Vec3(0.6, 1.1, 0.6))
        };
        
        if (!this.enemyShapes.goblin || !this.enemyShapes.orc) {
            console.error("Failed to create enemy physics shapes!");
        } else {
            console.log("Enemy physics shapes created:", this.enemyShapes);
        }
    }

    init() {
        console.log("Enemy manager initialized.");
    }

    startWave(waveIndex) {
        if (waveIndex >= this.waveDefinitions.length) {
            console.log("All waves completed!");
            this.currentWaveIndex = waveIndex;
            return;
        }
        if (this._isSpawning) {
            console.warn("Already spawning wave", this.currentWaveIndex);
            return;
        }

        this.currentWaveIndex = waveIndex;
        const waveDef = this.waveDefinitions[this.currentWaveIndex];
        this.enemiesToSpawn = waveDef.count;
        this.spawnTimer = waveDef.spawnDelay;
        this._isSpawning = true;
        this.gameState.currentWave = this.currentWaveIndex + 1;
        console.log(`[EnemyManager.startWave] Starting Wave ${this.currentWaveIndex + 1}. Spawning state set to: ${this._isSpawning}`); // Enhanced log
    }

    update(deltaTime) {
        if (this._isSpawning) {
            this.spawnTimer -= deltaTime;
             // Log spawning conditions periodically
             // console.log(`[EnemyManager.update] Spawning check: timer=${this.spawnTimer.toFixed(2)}, toSpawn=${this.enemiesToSpawn}, isSpawning=${this._isSpawning}`);
            if (this.spawnTimer <= 0 && this.enemiesToSpawn > 0) {
                console.log(`[EnemyManager.update] Conditions met. Attempting spawn...`); // Log attempt
                const success = this.spawnEnemy();
                if (success) {
                    this.enemiesToSpawn--;
                    console.log(`[EnemyManager.update] Spawn successful. Remaining: ${this.enemiesToSpawn}`); // Log success and remaining count
                } else {
                    console.log(`[EnemyManager.update] spawnEnemy() returned false.`); // Log failure
                }

                if (this.enemiesToSpawn === 0) {
                    this._isSpawning = false;
                    console.log(`Wave ${this.currentWaveIndex + 1} spawning complete.`);
                } else {
                    this.spawnTimer = this.waveDefinitions[this.currentWaveIndex].spawnDelay;
                }
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy || !enemy.body || !enemy.mesh) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Check if dead *before* updating, add to removal queue
            if (enemy.isDead()) {
                if (!this.enemiesToRemove.includes(enemy)) { // Avoid duplicates
                    this.enemiesToRemove.push(enemy);
                }
                continue; // Skip update for dead enemies
            }

            enemy.update(deltaTime, this.target);

            // Check if dead *after* updating, add to removal queue
            if (enemy.isDead()) {
                 if (!this.enemiesToRemove.includes(enemy)) { // Avoid duplicates
                     this.enemiesToRemove.push(enemy);
                 }
            }
        }

        // Process removals *after* the main update loop
        this.processRemovals();
    }

    spawnEnemy() {
        if (this.currentWaveIndex < 0 || this.currentWaveIndex >= this.waveDefinitions.length) {
            console.error("Invalid wave index:", this.currentWaveIndex);
            return false;
        }

        const waveDef = this.waveDefinitions[this.currentWaveIndex];
        const enemyType = waveDef.type;
        const enemyAssetData = this.assets[enemyType];
        // Remove initial physicsShape assignment, it will be determined dynamically
        // const physicsShape = this.enemyShapes[enemyType];

        // Log the results of the checks before the conditions
        console.log(`[EnemyManager.spawnEnemy] Check - Type: ${enemyType}`);
        console.log(`[EnemyManager.spawnEnemy] Check - Asset Data:`, enemyAssetData);
        // Removed physicsShape log here

        if (!enemyAssetData?.scene) {
            console.error(`[EnemyManager.spawnEnemy] FAILED CHECK: Asset missing scene for ${enemyType}`); // More specific log
            this.enemiesToSpawn = 0;
            this._isSpawning = false;
            return false;
        }

        // --- Use Pre-defined Shape and Calculate Center Position ---
        const finalPhysicsShape = this.enemyShapes[enemyType]; // Always use pre-defined shape
        if (!finalPhysicsShape) {
            console.error(`[EnemyManager.spawnEnemy] FAILED CHECK: Pre-defined physics shape missing for ${enemyType}`);
            this.enemiesToSpawn = 0;
            this._isSpawning = false;
            return false;
        }
        // Calculate spawnY based on the center of the pre-defined shape
        const spawnY = finalPhysicsShape.halfExtents.y;
        console.log(`[EnemyManager.spawnEnemy - ${enemyType}] Using pre-defined shape. SpawnY (Center): ${spawnY}`);
        // --- End Shape/Position Calculation ---


        try {
            const spawnRadius = 25; // Reduced from 80 for closer spawns
            const angle = Math.random() * Math.PI * 2;
            const spawnX = Math.cos(angle) * spawnRadius;
            const spawnZ = Math.sin(angle) * spawnRadius;
            // spawnY represents the desired CENTER position Y

            const enemy = new Enemy(
                this.scene,
                this.physicsInstance, // Pass the Physics instance
                this.audioManager,
                enemyAssetData, // Pass the original asset data (Enemy will clone and scale)
                finalPhysicsShape, // Pass the dynamically determined shape
                new THREE.Vector3(spawnX, spawnY, spawnZ), // Pass the calculated CENTER spawn position
                waveDef, // Pass the full wave definition (includes scale)
                enemyType,
                this.target,
                this
            );
            enemy.init();

            if (!enemy.mesh || !enemy.body) {
                throw new Error("Enemy initialization failed");
            }

            this.enemies.push(enemy);
            console.log(`[EnemyManager.spawnEnemy] Successfully spawned ${enemyType} at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}, ${spawnZ.toFixed(1)})`); // Added confirmation log
            return true;
        } catch (error) {
            console.error(`[EnemyManager.spawnEnemy] CRITICAL ERROR during Enemy creation/initialization for type ${enemyType}:`, error); // Enhanced Log
            this.enemiesToSpawn = 0;
            this._isSpawning = false;
            return false;
        }
    }

    handleEnemyDeath(enemy, index) {
        this.gameState.score += enemy.config.points || 0;
        this.gameState.resources += enemy.config.resource || 0;
        enemy.die();
        // Find index based on the enemy instance itself to remove from the manager's list
        const listIndex = this.enemies.indexOf(enemy); // Use different variable name
        if (listIndex > -1) {
            this.enemies.splice(listIndex, 1);
        } else {
            // This might happen if the enemy was already removed (e.g., by tower hit handler adding to queue)
            // console.warn("Enemy marked for death not found in active list during handleEnemyDeath.");
        }
    }

     processRemovals() {
        if (this.enemiesToRemove.length === 0) return;

        console.log(`[EnemyManager.processRemovals] Processing ${this.enemiesToRemove.length} removals.`);
        for (const enemy of this.enemiesToRemove) {
            this.handleEnemyDeath(enemy); // Call the existing death handler
        }
        this.enemiesToRemove = []; // Clear the queue
     }

    handleTowerHit(enemyInstance, damageAmount) {
        if (this.gameState.isGameOver || !enemyInstance) return;

        console.log(`${enemyInstance.type} hit tower for ${damageAmount} damage`);
        this.gameState.towerHealth -= damageAmount;
        this.gameState.towerHealth = Math.max(0, this.gameState.towerHealth);
        this.audioManager.playSound('towerHit');

        // Mark enemy as dead and queue for removal. No need to find index here.
        enemyInstance.die(); // Mark as dead (sets flag, removes body/mesh via Enemy.die)
        if (!this.enemiesToRemove.includes(enemyInstance)) { // Add to queue if not already there
            this.enemiesToRemove.push(enemyInstance);
        }
    }

    isWaveComplete() {
        return !this._isSpawning && this.enemies.length === 0 && this.currentWaveIndex < this.waveDefinitions.length;
    }

    isLevelComplete() {
        return this.currentWaveIndex >= this.waveDefinitions.length && this.enemies.length === 0 && !this._isSpawning;
    }

    isSpawning() {
        return this._isSpawning;
    }

    getCurrentWaveIndex() {
        return this.currentWaveIndex; // Return the internal 0-based index
    }
}

export default EnemyManager;
