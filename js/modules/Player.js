import * as THREE from 'three';
import Bow from './Bow.js';

class Player {
    constructor(inputManager, camera, scene, physics, audioManager, assets, gameState) { // Changed physicsWorld to physics
        this.inputManager = inputManager;
        this.camera = camera;
        this.scene = scene; // Needed to add bow model relative to camera
        this.physics = physics; // Store the Physics class instance
        this.audioManager = audioManager;
        this.assets = assets;
        this.gameState = gameState; // Reference to shared game state

        this.bow = null; // Will hold the Bow instance
        this.towerReference = { position: new THREE.Vector3(0, 7.5, 0), health: this.gameState.towerHealth }; // Simple tower ref

        // Camera control variables (Pointer Lock)
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ'); // Use YXZ order for typical FPS controls
        this.minPolarAngle = 0; // Minimum look down angle
        this.maxPolarAngle = Math.PI; // Maximum look up angle
        this.lookSensitivity = 0.002;

        // Fixed position for the player/camera
        this.position = new THREE.Vector3(0, 15, 0); // Top of the tower
    }

    init() {
        this.camera.position.copy(this.position);

        // Create the bow, attach visually to camera
        this.bow = new Bow(
            this.scene,
            this.physics, // Pass the Physics instance
            this.camera, // Pass camera for aiming direction
            this.audioManager,
            this.assets, // Pass assets for bow/arrow models
            this // Pass player reference for callbacks? (e.g. onShoot)
         );
        this.bow.init();

        // Attach bow model visually to the camera
        // Note: Positioning needs careful adjustment based on the bow model's origin
        const bowMesh = this.bow.getBowMesh();
        if (bowMesh) {
            this.camera.add(bowMesh); // Add bow as child of camera
            bowMesh.position.set(0.5, -0.5, -1); // Example position relative to camera (adjust!)
            bowMesh.rotation.y = -Math.PI / 20; // Slight rotation (adjust!)
            bowMesh.scale.set(0.1, 0.1, 0.1); // Scale down bow model (adjust!)
        }

        // Add listener for when player takes damage (maybe from specific enemy types later)
    }

    update(deltaTime) {
        this.handleInput(deltaTime);
        this.bow.update(deltaTime); // Update bow state (drawing, etc.)

        // Update tower health reference in case it changes elsewhere
        this.towerReference.health = this.gameState.towerHealth;
    }

    handleInput(deltaTime) {
        if (!this.inputManager.isEnabled) return;

        // --- Aiming (Pointer Lock) ---
        const mouseMovement = this.inputManager.getMouseMovement();

        // Only update rotation if there was mouse movement
        if (mouseMovement.x !== 0 || mouseMovement.y !== 0) {
            //console.log(`Mouse Movement: x=${mouseMovement.x}, y=${mouseMovement.y}`); // DEBUG LOG
            this.euler.setFromQuaternion(this.camera.quaternion);

            // Apply mouse movement to rotation angles
            this.euler.y -= mouseMovement.x * this.lookSensitivity; // Yaw
            this.euler.x -= mouseMovement.y * this.lookSensitivity; // Pitch
            //console.log(`Euler before clamp: x=${this.euler.x.toFixed(3)}, y=${this.euler.y.toFixed(3)}`); // DEBUG LOG

            // Clamp vertical rotation (pitch) to prevent looking straight up/down or flipping
            // Limit between roughly -89 and +89 degrees (-PI/2 * 0.99 to PI/2 * 0.99 radians)
            const piOverTwo = Math.PI / 2;
            this.euler.x = Math.max(-piOverTwo * 0.99, Math.min(piOverTwo * 0.99, this.euler.x));
            //console.log(`Euler after clamp: x=${this.euler.x.toFixed(3)}, y=${this.euler.y.toFixed(3)}`); // DEBUG LOG

            this.camera.quaternion.setFromEuler(this.euler);
        }

        // --- Shooting ---
         if (this.inputManager.isMouseButtonDown()) {
             // Start or continue drawing the bow
             const drawTime = this.inputManager.getMouseButtonDownTime();
             this.bow.draw(drawTime);
         } else if (!this.inputManager.isMouseButtonDown() && this.bow.isDrawing()) {
             // Mouse button was released after drawing
             this.bow.release();
         }

        // --- Other Controls (Example: Use 'R' for reload if implementing quivers later) ---
        // if (this.inputManager.isKeyPressed('KeyR')) {
        //     // Handle reload action
        // }
    }

     takeDamage(amount) {
        if (this.gameState.isGameOver) return;
        this.gameState.playerHealth -= amount;
        this.gameState.playerHealth = Math.max(0, this.gameState.playerHealth); // Clamp at 0
        console.log(`Player took ${amount} damage. Health: ${this.gameState.playerHealth}`);
        // TODO: Add visual/audio feedback for taking damage
         this.audioManager.playSound('playerHit'); // Example sound
         // Check for game over immediately after taking damage
         // (Game class also checks, but could be done here too)
     }

     // Provides a target reference (the physics body) for enemies or other systems
     getTowerReference() {
         // Return the actual physics body stored in the Physics instance
         return this.physics.towerBody;
     }
}

export default Player;
