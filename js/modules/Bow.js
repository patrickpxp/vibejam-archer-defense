import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Bow {
    constructor(scene, physics, camera, audioManager, assets, player) { // Changed physicsWorld to physics
        this.scene = scene;
        this.physics = physics; // Store the Physics class instance
        this.camera = camera;
        this.audioManager = audioManager;
        this.assets = assets;
        this.player = player; // Reference to player if needed

        this.bowMesh = null; // Visual representation
        this.arrowMeshTemplate = null; // Template for visual arrows
        this.arrowShape = null; // Physics shape for arrows

        this._isDrawing = false;
        this.drawStartTime = 0;
        this.currentDrawStrength = 0; // Normalized 0-1
        this.maxDrawTime = 1.5; // Time in seconds for full draw
        this.minShootVelocity = 20;
        this.maxShootVelocity = 70; // Max velocity at full draw
        this.arrowMass = 0.1; // Mass in kg

        // Cooldown properties
        this.cooldownDuration = 0.5; // Seconds between shots
        this.cooldownTimer = 0; // Time remaining until next shot is allowed

        this.activeArrows = []; // Keep track of active arrows (visual + physics)
        this.arrowsToRemove = []; // Queue for deferred arrow removal
    }

    init() {
        // --- Setup Bow Model ---
        const bowAssetData = this.assets['bow']; // Get asset data { scene: Mesh/Group, isPlaceholder: boolean }
        if (bowAssetData?.scene) {
            this.bowMesh = bowAssetData.scene.clone(); // CLONE the scene object
            // Apply necessary transformations AFTER cloning
            this.bowMesh.name = bowAssetData.isPlaceholder ? "Placeholder_Bow_Instance" : "Loaded_Bow_Instance";
            console.log(bowAssetData.isPlaceholder ? "Using placeholder bow mesh." : "Using loaded bow model.");
            // Note: Positioning/scaling now happens in Player.js where it's added to the camera
        } else {
            console.error("Bow asset data or scene not found!");
            // Create a minimal failsafe geometry?
            this.bowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true }));
            this.bowMesh.name = "Failsafe_Bow_Instance";
        }

        // --- Setup Arrow Template ---
        const arrowAssetData = this.assets['arrow'];
        if (arrowAssetData?.scene) {
            this.arrowMeshTemplate = arrowAssetData.scene.clone(); // CLONE the template scene object
             this.arrowMeshTemplate.name = bowAssetData.isPlaceholder ? "Placeholder_Arrow_Template" : "Loaded_Arrow_Template";

            // Apply scaling/orientation adjustments *to the template* if needed
            if (arrowAssetData.isPlaceholder) {
                // Placeholder might already be scaled/oriented correctly by AssetLoader
                 this.arrowMeshTemplate.scale.set(1, 1, 1); // Adjust if needed
            } else {
                // Scale/orient loaded GLTF arrow model template if necessary
                this.arrowMeshTemplate.scale.set(0.1, 0.1, 0.1); // Example scale for a loaded GLTF
                // Ensure GLTF arrow model points down Z-axis if that's assumed by physics
                // this.arrowMeshTemplate.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // Example rotation if needed
            }
            console.log(arrowAssetData.isPlaceholder ? "Using placeholder arrow template." : "Using loaded arrow model.");

            // --- Physics Shape (Derive from the *unrotated* dimensions stored by AssetLoader) ---
            if (arrowAssetData.unrotatedSize) {
                const size = arrowAssetData.unrotatedSize;
                // Create Box shape using half extents from the unrotated size
                // Ensure axes match: Box(halfX, halfY, halfZ) should correspond to unrotated model's width, height, length
                const halfExtents = new CANNON.Vec3(
                    Math.max(0.01, size.x / 2),
                    Math.max(0.01, size.y / 2),
                    Math.max(0.01, size.z / 2) // Assuming Z was the length axis before rotation
                );
                this.arrowShape = new CANNON.Box(halfExtents);
                console.log("Arrow physics shape created based on unrotated size:", size.x, size.y, size.z);
            } else {
                console.warn("Unrotated size not found for arrow asset. Using default physics shape.");
                this.arrowShape = new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.15)); // Smaller default fallback
            }
        } else {
            console.error("Arrow asset data or scene not found! Cannot create arrows.");
            // Handle error - maybe prevent shooting?
            this.arrowMeshTemplate = null; // Ensure template is null if failed
            this.arrowShape = null;
        }
    }

    getBowMesh() {
        return this.bowMesh;
    }

    isDrawing() {
        return this._isDrawing;
    }

    draw(drawTime) {
        if (!this._isDrawing) {
            this._isDrawing = true;
            this.drawStartTime = performance.now();
            // TODO: Add visual feedback for starting draw (e.g., bow string pull animation)
            this.audioManager.playSound('bowDraw'); // Play draw sound
        }

        // Calculate draw strength based on time held, capped at maxDrawTime
        const elapsedDrawTime = (performance.now() - this.drawStartTime) / 1000;
        this.currentDrawStrength = Math.min(elapsedDrawTime / this.maxDrawTime, 1.0);

        // TODO: Update bow visual based on draw strength (e.g., blend shape, animation frame)
        // console.log(`Drawing... Strength: ${this.currentDrawStrength.toFixed(2)}`);
    }

    release() {
        if (!this._isDrawing) return; // Can't release if not drawing
        if (this.cooldownTimer > 0) {
            console.log(`Bow cooldown active: ${this.cooldownTimer.toFixed(2)}s remaining.`);
            // Optionally provide feedback to the player (e.g., sound)
            return; // Exit if cooldown is active
        }

        const shootVelocity = this.minShootVelocity + (this.maxShootVelocity - this.minShootVelocity) * this.currentDrawStrength;

        console.log(`Releasing arrow! Strength: ${this.currentDrawStrength.toFixed(2)}, Velocity: ${shootVelocity.toFixed(2)}`);
        const shotFired = this.shootArrow(shootVelocity); // shootArrow now returns true/false

        // Reset drawing state and start cooldown *only if shot was successful*
        if (shotFired) {
            this.cooldownTimer = this.cooldownDuration; // Start cooldown
            this._isDrawing = false;
            this.currentDrawStrength = 0;
            // TODO: Reset bow visual to idle state
            this.audioManager.playSound('arrowShoot');
        } else {
            // If shooting failed (e.g., no template), reset drawing state without cooldown
            this._isDrawing = false;
            this.currentDrawStrength = 0;
        }
    }

    shootArrow(velocity) {
        // Add checks for valid template and shape before proceeding
        // Use this.physics.getMaterial and this.physics.getWorld()
         if (!this.arrowMeshTemplate || !this.arrowShape || !this.physics.getMaterial('arrow')) {
             console.error("Cannot shoot arrow: Missing template, physics shape, or physics material.");
             return false; // Return false on failure
         }

        // --- Create Arrow Mesh (Visual) ---
        const arrowMesh = this.arrowMeshTemplate.clone(); // Clone the TEMPLATE
        arrowMesh.castShadow = true;
        arrowMesh.name = this.arrowMeshTemplate.name.replace("_Template", "_Instance"); // Set instance name

        // --- Create Arrow Physics Body ---
        const arrowMaterial = this.physics.getMaterial('arrow'); // Use this.physics
        if (!arrowMaterial) {
             console.error("Arrow physics material not found in Physics world!");
             return false; // Cannot create body without material
        }
         const arrowBody = new CANNON.Body({
             mass: this.arrowMass,
             shape: this.arrowShape, // Use the shape derived in init()
             material: arrowMaterial
         });
        // ... (rest of physics body setup: damping, userData, linking) ...
        arrowBody.angularDamping = 0.4;
        arrowBody.linearDamping = 0.01;
        arrowBody.userData = { mesh: arrowMesh, type: 'arrow' };
        arrowMesh.userData = { body: arrowBody };


        // --- Initial Position & Orientation ---
        const cameraPosition = new THREE.Vector3();
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPosition);
        this.camera.getWorldDirection(cameraDirection);

        const offsetDistance = 1.0;
        const startPosition = cameraPosition.add(cameraDirection.clone().multiplyScalar(offsetDistance));

        // Apply position/rotation to BOTH mesh and body
        arrowMesh.position.copy(startPosition);
        arrowMesh.quaternion.copy(this.camera.quaternion);
        // Apply template's base rotation if needed (placeholder rotation is handled in template clone)
        // arrowMesh.quaternion.multiply(this.arrowMeshTemplate.quaternion); // NO! Template rotation is part of the clone

        arrowBody.position.copy(arrowMesh.position);
        arrowBody.quaternion.copy(arrowMesh.quaternion);


        // --- Apply Initial Velocity ---
        const initialVelocity = cameraDirection.multiplyScalar(velocity); // Camera direction is already calculated
        arrowBody.velocity.copy(initialVelocity);


        // --- Add to World ---
        this.scene.add(arrowMesh);
        this.physics.addBody(arrowBody); // Use this.physics

        // --- Add Collision Listener ---
        const collisionListener = (event) => this.handleArrowCollision(event, arrowBody, arrowMesh);
        arrowBody.addEventListener('collide', collisionListener);
        arrowBody.collisionListener = collisionListener;


        // --- Track Active Arrow ---
        const activeArrow = { mesh: arrowMesh, body: arrowBody, timestamp: performance.now() };
        this.activeArrows.push(activeArrow);


        this.cleanupOldArrows();
        return true; // Return true on successful shot
    }

    handleArrowCollision(event, arrowBody, arrowMesh) {
        const hitBody = event.body; // The body the arrow collided with
        const hitPoint = event.contact.ri; // Impact point on the arrow body
        const contactNormal = event.contact.ni; // Normal vector at the contact point

        console.log(`Arrow collided with object type: ${hitBody.userData?.type || 'unknown'}`);
        this.audioManager.playSound('arrowHit'); // Generic hit sound

        // Check if hit an enemy
        if (hitBody.userData?.type === 'enemy') {
             // TODO: Notify EnemyManager or the specific enemy instance about the hit
             if(hitBody.userData.enemyInstance) {
                 const damage = 10 + Math.round(this.currentDrawStrength * 15); // Base damage + bonus for draw strength
                  hitBody.userData.enemyInstance.takeDamage(damage);
              }
              // Queue arrow for removal instead of immediate removal
              this.queueArrowRemoval(arrowBody, arrowMesh);
         }
         // Check if hit the ground or tower (static objects)
        else if (hitBody.mass === 0) { // Hit static object like ground or tower
            // Make the arrow stick
            this.stickArrow(arrowBody, arrowMesh, hitBody, hitPoint, contactNormal);
        }
        // Handle other collision types if needed
        else {
         // Maybe bounce slightly or just remove
              // Queue arrow for removal instead of immediate removal
              this.queueArrowRemoval(arrowBody, arrowMesh);
         }
     }

     stickArrow(arrowBody, arrowMesh, hitBody, hitPoint, contactNormal) {
         // Remove physics simulation by setting mass to 0
         arrowBody.mass = 0;
         arrowBody.type = CANNON.Body.STATIC; // Make it a static body
         arrowBody.velocity.setZero();
         arrowBody.angularVelocity.setZero();
         arrowBody.updateMassProperties(); // Apply changes

         // Optional: Attach visually to the hit object if it's dynamic (though here we assume static)
         // For static, just leave it where it landed based on physics position

          // Detach collision listener once stuck
         if (arrowBody.collisionListener) { // Check if listener exists before removing
            arrowBody.removeEventListener('collide', arrowBody.collisionListener);
            arrowBody.collisionListener = null; // Clear stored listener
         }


         console.log("Arrow stuck.");
         // Keep the arrow in the activeArrows list for potential timed cleanup
     }

     // Ensure removeArrow disposes geometry/material correctly if they aren't shared templates
     removeArrow(arrowBody, arrowMesh) {
        if (!arrowMesh || !arrowBody) return;

        const index = this.activeArrows.findIndex(a => a.body === arrowBody);
        if (index !== -1) {
            this.activeArrows.splice(index, 1);
        }

        // Detach collision listener before removing body
        if (arrowBody.collisionListener) {
            arrowBody.removeEventListener('collide', arrowBody.collisionListener);
            arrowBody.collisionListener = null;
        }

        this.physics.removeBody(arrowBody); // Use this.physics
        this.scene.remove(arrowMesh);

        // Dispose of the specific instance's geometry and material to free memory
         if (arrowMesh.geometry) arrowMesh.geometry.dispose();
         if (arrowMesh.material) {
            if (Array.isArray(arrowMesh.material)) {
                arrowMesh.material.forEach(material => material.dispose());
            } else {
                arrowMesh.material.dispose();
            }
         }


         // console.log("Arrow removed and resources disposed."); // More detailed log
     }

     queueArrowRemoval(arrowBody, arrowMesh) {
        // Add to queue if not already present
        if (!this.arrowsToRemove.some(item => item.body === arrowBody)) {
            this.arrowsToRemove.push({ body: arrowBody, mesh: arrowMesh });
        }
     }

     processArrowRemovals() {
        if (this.arrowsToRemove.length === 0) return;

        // console.log(`[Bow.processArrowRemovals] Processing ${this.arrowsToRemove.length} arrow removals.`);
        for (const arrowData of this.arrowsToRemove) {
            this.removeArrow(arrowData.body, arrowData.mesh);
        }
        this.arrowsToRemove = []; // Clear the queue
     }


    cleanupOldArrows(maxAgeSeconds = 15) {
        const now = performance.now();
        const maxAgeMs = maxAgeSeconds * 1000;

        // Iterate backwards to allow safe removal while iterating
        for (let i = this.activeArrows.length - 1; i >= 0; i--) {
            const arrow = this.activeArrows[i];
             // Only queue removal for arrows that are stuck (static) and old enough
             if (arrow.body.type === CANNON.Body.STATIC && (now - arrow.timestamp > maxAgeMs)) {
                 console.log("Queueing old stuck arrow for removal");
                 this.queueArrowRemoval(arrow.body, arrow.mesh);
             }
             // Maybe add another condition for arrows flying too far?
              else if (arrow.mesh.position.lengthSq() > 500*500) { // Example: very far away
                  console.log("Queueing arrow that flew too far for removal");
                  this.queueArrowRemoval(arrow.body, arrow.mesh);
              }
         }
    }


    update(deltaTime) {
        // Update positions of active arrow meshes based on their physics bodies
        this.activeArrows.forEach(arrow => {
            if (arrow.mesh && arrow.body) {
                arrow.mesh.position.copy(arrow.body.position);
                 arrow.mesh.quaternion.copy(arrow.body.quaternion);
             }
         });

        // Process deferred removals at the end of the update
        this.processArrowRemovals();

         // Any other bow-specific logic per frame
         if (this._isDrawing) {
             // Update draw strength even if mouse isn't moving (time based)
             const elapsedDrawTime = (performance.now() - this.drawStartTime) / 1000;
             this.currentDrawStrength = Math.min(elapsedDrawTime / this.maxDrawTime, 1.0);
             // Update visual based on currentDrawStrength
        }

        // Update cooldown timer
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
            if (this.cooldownTimer < 0) {
                this.cooldownTimer = 0; // Ensure it doesn't go negative
            }
        }
    }
}

export default Bow;
