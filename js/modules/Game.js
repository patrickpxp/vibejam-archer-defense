import Renderer from './Renderer.js';
import Physics from './Physics.js';
import InputManager from './InputManager.js';
import Player from './Player.js';
import EnemyManager from './EnemyManager.js';
import UIManager from './UIManager.js';
import AudioManager from './AudioManager.js';
import Persistence from './Persistence.js';
import AssetLoader from './AssetLoader.js';
import * as THREE from 'three';
// Removed CANNON and CannonDebugger imports

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.assetLoader = new AssetLoader();
        this.renderer = new Renderer(canvas, this.assetLoader);
        this.physics = new Physics();
        this.inputManager = new InputManager(canvas);
        this.audioManager = new AudioManager(); // Initialize audio
        this.uiManager = new UIManager();
        this.persistence = new Persistence();

        // Game state - potentially loaded/saved
        this.gameState = {
            playerHealth: 100,
            towerHealth: 100,
            score: 0,
            resources: 0,
            currentWave: 0,
            isGameOver: false,
            // Add other relevant states like upgrades purchased
        };

        this.player = null; // Will be initialized in init()
        this.enemyManager = null; // Will be initialized in init()
        this.decorativeItems = []; // To store physics-enabled decorations { mesh, body }
        this.quiverBody = null; // Reference to the quiver's physics body (still needed for freeze logic)
        this.stopDecorativePhysics = false; // Flag to stop updating decorative items

        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this); // Bind the game loop context
    }

    async init() {
        console.log("Initializing Game Modules...");
        // Load saved state if available
        const savedState = this.persistence.loadGame();
        if (savedState) {
            console.log("Loading saved game state...");
            this.gameState = { ...this.gameState, ...savedState }; // Merge saved state
        } else {
            console.log("No saved state found, starting fresh.");
        }

        // Load assets first
        await this.assetLoader.loadAll(); // Wait for models/textures/sounds
        console.log("Assets loaded.");

        const loadedAssets = this.assetLoader.getAssets(); // Get assets once

        // Initialize modules that depend on assets or loaded state
        this.renderer.init(loadedAssets); // Pass loaded assets to renderer

        // Initialize Physics (Scene needed for debugger)
        // Tower dimensions will be handled manually within Physics.js now
        this.physics.init(this.renderer.getScene());
        this.audioManager.init(loadedAssets); // Pass loaded audio assets

        // Debugger is now initialized within Physics.init()

        // Setup player (depends on renderer camera, input, physics)
        this.player = new Player(
            this.inputManager,
            this.renderer.getCamera(),
            this.renderer.getScene(),
            this.physics, // Pass the whole Physics class instance
            this.audioManager,
            this.assetLoader.getAssets(), // Pass assets for bow/arrow models
            this.gameState // Pass initial state
        );
        this.player.init();
        // Position player camera (fixed on tower)
        this.renderer.getCamera().position.set(0, 2, 0); // Example: Tower height 15m
        this.renderer.getCamera().lookAt(4, -2, -9); // Look slightly outwards

        // Setup enemies (depends on scene, physics, player/tower target)
        this.enemyManager = new EnemyManager(
            this.renderer.getScene(),
            this.physics, // Pass the whole Physics instance now
            this.audioManager,
            this.assetLoader.getAssets(), // Pass assets for enemy models
            this.gameState, // Pass state for scoring etc.
            this.player.getTowerReference() // Provide a target
        );
        this.enemyManager.init();

        // Initial UI Update
        this.uiManager.update(this.gameState);

        // Start the first wave (or loaded wave)
        // Force start from wave 0 for testing, overriding saved state if necessary
        this.gameState.currentWave = 0;
        console.log(`[Game.init] Forcing start from wave 0. Calling enemyManager.startWave(${this.gameState.currentWave})`); // Log before call
        this.enemyManager.startWave(this.gameState.currentWave);
        console.log(`[Game.init] enemyManager.startWave() called. Spawning state: ${this.enemyManager.isSpawning()}`); // Log after call

        console.log("Game Initialization Complete.");

        // Add decorative quiver
        this.addQuiverDecoration();

        // Setup initial event listeners from UI etc. if needed
        this.setupEventListeners();

        // Timer logic moved inside addQuiverDecoration
    }

     addQuiverDecoration() {
        const quiverAsset = this.assetLoader.getAsset('quiver');
        const arrowAsset = this.assetLoader.getAsset('arrow');

        if (!quiverAsset?.scene || !arrowAsset?.scene) {
            console.warn("Could not add quiver decoration: Quiver or Arrow asset missing.");
            return;
        }

        // --- Create Visual Quiver ---
        const quiverInstance = quiverAsset.scene.clone();
        const quiverPosition = new THREE.Vector3(0, 0.8, -0.4); // Adjust as needed
        quiverInstance.position.copy(quiverPosition);
        quiverInstance.rotation.y = -Math.PI / 4;
        this.renderer.getScene().add(quiverInstance); // Add visual quiver immediately

        // --- Create Dynamic Quiver Physics Body ---
        const quiverShapeParams = quiverInstance.geometry?.parameters;
        let quiverBody = null; // Local variable for the body
        // Ensure geometry is BoxGeometry before accessing width/height/depth
        if (quiverShapeParams && quiverInstance.geometry.type === 'BoxGeometry') {
            const physicsParams = {
                quiverPosition: { x: quiverPosition.x, y: quiverPosition.y, z: quiverPosition.z },
                quiverQuaternion: { x: quiverInstance.quaternion.x, y: quiverInstance.quaternion.y, z: quiverInstance.quaternion.z, w: quiverInstance.quaternion.w },
                // Pass width, height, depth for compound shape creation
                quiverShapeParams: {
                    width: quiverShapeParams.width,
                    height: quiverShapeParams.height,
                    depth: quiverShapeParams.depth
                }
            };
            quiverBody = this.physics.createQuiverBody(physicsParams);
            if (quiverBody) {
                // Store reference and add to items needing visual updates
                this.quiverBody = quiverBody;
                this.decorativeItems.push({ mesh: quiverInstance, body: quiverBody });
            }
        } else {
             console.warn("Cannot add quiver physics: Missing geometry params.");
        }

        // --- Wait 1 second, freeze quiver, then drop arrows --- // MODIFIED DELAY
        setTimeout(() => {
            // Freeze the quiver body using the Physics method
            if (this.quiverBody) {
                console.log("Freezing quiver physics body via Physics module.");
                this.physics.freezeBody(this.quiverBody);
            } else {
                console.warn("Quiver body reference not found for freezing.");
            }

            console.log("Dropping decorative arrows...");
            // Ensure quiverShapeParams exists before trying to use it for arrow positioning
            if (!quiverShapeParams) {
                 console.error("Cannot drop arrows: Quiver geometry parameters unavailable.");
                 return;
            }
            const arrowShape = this.player?.bow?.arrowShape;
            const arrowMaterial = this.physics.getMaterial('arrow');
            const arrowInitialData = [];
                const arrowMeshes = [];
                const numArrows = 5;

                if (!arrowShape || !arrowMaterial || !this.quiverBody) { // Check quiverBody exists
                    console.warn("Cannot drop decorative arrows: Missing arrow shape, material, or frozen quiver body.");
                    return;
                }

                // Get the final position and rotation of the frozen quiver body
                const finalQuiverPos = this.quiverBody.position; // CANNON.Vec3
                const finalQuiverQuat = this.quiverBody.quaternion; // CANNON.Quaternion
                const quiverTopY = finalQuiverPos.y + quiverShapeParams.height / 2; // Approx top edge Y in world space

                for (let i = 0; i < numArrows; i++) {
                    const arrowInstance = arrowAsset.scene.clone();
                    // Use width/depth for radius calculation, take the smaller one for safety
                    const quiverRadiusApprox = Math.min(quiverShapeParams.width, quiverShapeParams.depth) / 2 * 0.8; // 80% of half-width/depth
                    const randomAngle = Math.random() * Math.PI * 2;
                    const randomRadius = Math.random() * quiverRadiusApprox;
                    // Calculate starting height slightly above the quiver's top edge
                    const startHeightOffset = 0.01 ;// dear AI ; i've set this manually
                    const randomTilt = (Math.random() - 0.5) * 0.3; // Random lean

                    // Calculate initial position relative to the *frozen quiver body's center*
                    const arrowLocalPos = new THREE.Vector3(
                        Math.cos(randomAngle) * randomRadius,
                        (quiverShapeParams.height / 2) + startHeightOffset, // Position relative to quiver center Y + offset
                        Math.sin(randomAngle) * randomRadius
                    );

                    // Convert local position to world position using the *frozen body's* orientation and position
                    const arrowWorldPos = new THREE.Vector3(arrowLocalPos.x, arrowLocalPos.y, arrowLocalPos.z);
                    // Apply the quiver body's rotation (CANNON.Quaternion to THREE.Quaternion)
                    const threeQuiverQuat = new THREE.Quaternion(finalQuiverQuat.x, finalQuiverQuat.y, finalQuiverQuat.z, finalQuiverQuat.w);
                    arrowWorldPos.applyQuaternion(threeQuiverQuat);
                    // Add the quiver body's final world position (CANNON.Vec3 to THREE.Vector3)
                    arrowWorldPos.add(new THREE.Vector3(finalQuiverPos.x, finalQuiverPos.y, finalQuiverPos.z));


                    // Keep the random orientation logic
                    const arrowRotation = new THREE.Euler(
                        Math.PI / 2 + randomTilt, 0, (Math.random() - 0.5) * Math.PI // Keep Z-axis rotation random for variety
                );
                const arrowWorldQuat = new THREE.Quaternion().setFromEuler(arrowRotation);

                arrowInstance.position.copy(arrowWorldPos);
                arrowInstance.quaternion.copy(arrowWorldQuat);
                arrowInstance.scale.set(0.9, 0.9, 0.9);

                arrowInitialData.push({
                    position: { x: arrowWorldPos.x, y: arrowWorldPos.y, z: arrowWorldPos.z },
                    quaternion: { x: arrowWorldQuat.x, y: arrowWorldQuat.y, z: arrowWorldQuat.z, w: arrowWorldQuat.w }
                });
                arrowMeshes.push(arrowInstance);
                this.renderer.getScene().add(arrowInstance);
            }

            // Call physics module to create dynamic arrow bodies
            const arrowPhysicsParams = {
                arrowShape: arrowShape,
                arrowMaterial: arrowMaterial,
                numArrows: numArrows,
                arrowInitialData: arrowInitialData
            };
            const arrowBodies = this.physics.addDynamicArrowBodies(arrowPhysicsParams);

            // Link meshes and bodies
            if (arrowBodies.length === arrowMeshes.length) {
                for (let i = 0; i < arrowBodies.length; i++) {
                    this.decorativeItems.push({ mesh: arrowMeshes[i], body: arrowBodies[i] });
                }
            } else {
                console.error("Mismatch between created arrow meshes and physics bodies.");
            }

            // Set timer to stop physics updates for these arrows after they settle (3 more seconds)
            // Set timer to stop physics updates AND set bodies to static after they settle
            // Set timer to freeze arrows via Physics module
            setTimeout(() => {
                console.log("Freezing decorative arrows via Physics module.");
                this.stopDecorativePhysics = true; // Stop visual sync
                this.physics.freezeDecorativeArrows(); // Call the freeze method
            }, 400); // 0.5 seconds after dropping

        }, 750); // 1 second initial delay before dropping arrows

        console.log("Added decorative quiver visual and initiated arrow drop sequence.");
     }

     // Correct setupEventListeners method is below, remove the duplicated one above
     setupEventListeners() {
        // Example: Upgrade button
        const upgradeBtn = document.getElementById('upgradeButton');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                 // Check resources and apply upgrade
                 const upgradeCost = 50; // Example cost
                 if (this.gameState.resources >= upgradeCost) {
                    this.gameState.resources -= upgradeCost;
                    console.log("Upgrade purchased!");
                    // TODO: Implement actual upgrade effect (e.g., player damage)
                    this.uiManager.update(this.gameState);
                 } else {
                    console.log("Not enough resources for upgrade.");
                 }
            });
        }
     }

    start() {
        if (this.gameState.isGameOver) return; // Don't start if already over
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }

    gameLoop(currentTime) {
        if (this.gameState.isGameOver) {
            console.log("Game Over. Stopping loop.");
            return; // Stop the loop if game over
        }

        const deltaTime = (currentTime - this.lastTime) / 1000; // Delta time in seconds
        this.lastTime = currentTime;

        // --- Update Phase ---
        this.inputManager.update(); // Update input state if necessary (e.g., for polling)
        this.physics.update(deltaTime); // Step the physics world
        this.player.update(deltaTime); // Update player (aiming, shooting logic)
        // console.log(`[Game.gameLoop] Calling enemyManager.update(). Spawning: ${this.enemyManager.isSpawning()}`); // Log before enemy update
        this.enemyManager.update(deltaTime); // Update enemies (movement, attacks)

        // Debugger is updated within physics.update()

        // --- Update Decorative Items (only if not stopped) ---
        if (!this.stopDecorativePhysics) {
            this.decorativeItems.forEach(item => {
                if (item.mesh && item.body) {
                    item.mesh.position.copy(item.body.position);
                    item.mesh.quaternion.copy(item.body.quaternion);
                }
            });
        }

        // --- Collision/State Checks ---
        this.checkCollisions(); // Check for arrow-enemy, enemy-tower etc.
        this.checkGameState(); // Check for win/loss conditions

        // --- UI Update ---
        this.uiManager.update(this.gameState); // Update displayed info

        // --- Rendering Phase ---
        this.renderer.render(); // Render the scene

        // Request next frame
        requestAnimationFrame(this.gameLoop);
    }

    checkCollisions() {
        // This is often handled within the Physics engine via event listeners
        // set up when objects (arrows, enemies) are created.
        // Example: Arrow's physics body might have a 'collide' event listener.
        // When an arrow hits an enemy:
        // - Deal damage to the enemy (in EnemyManager)
        // - Remove the arrow (from physics and scene)
        // - Add resources/score to gameState
        // - Play hit sound (audioManager)

        // Example: Enemy hits the tower:
        // - Deal damage to towerHealth in gameState
        // - Potentially remove or damage the enemy
        // - Play tower hit sound
    }

    checkGameState() {
        if (this.gameState.isGameOver) return; // Already checked

        if (this.gameState.playerHealth <= 0 || this.gameState.towerHealth <= 0) {
            this.gameOver("You have been defeated!");
        } else if (this.enemyManager.isLevelComplete()) {
            // Optional: Add logic for completing all defined waves
            // this.gameOver("You have defended the tower! VICTORY!");
        }

        // Check for wave completion to start the next one
        if (this.enemyManager.isWaveComplete() && !this.enemyManager.isSpawning()) {
            const currentManagerIndex = this.enemyManager.getCurrentWaveIndex();
            const nextWaveIndex = currentManagerIndex + 1;
            // No need to update gameState.currentWave here, startWave does it
            this.uiManager.showMessage(`Wave ${nextWaveIndex + 1} Incoming!`, 2000); // Show next wave number (1-based)
            // TODO: Add a delay or player ready signal before starting next wave?
            this.enemyManager.startWave(nextWaveIndex); // Pass the correct next 0-based index
            this.persistence.saveGame(this.gameState); // Save progress (gameState.currentWave is updated by startWave)
        }
    }

    gameOver(message) {
        console.log("GAME OVER:", message);
        this.gameState.isGameOver = true;
        this.uiManager.showGameOver(message);
        this.persistence.clearSave(); // Clear save on game over? Or allow retry?
        // Potentially stop sounds, disable input etc.
        this.inputManager.disable();
    }
}

export default Game;
