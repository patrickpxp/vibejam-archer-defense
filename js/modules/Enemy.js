import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Enemy {
    // Update constructor parameters
    constructor(scene, physicsInstance, audioManager, assetData, physicsShape, initialPosition, config, type, target, manager) { // Changed physicsWorld to physicsInstance
        this.scene = scene;
        this.physicsInstance = physicsInstance; // Store the Physics class instance
        this.physicsWorld = physicsInstance.getWorld(); // Get the CANNON.World instance
        this.audioManager = audioManager;
        this.assetData = assetData; // Store { scene: Object3D, isPlaceholder: boolean }
        this.shape = physicsShape;   // Store the predefined CANNON.Shape
        this.initialPosition = initialPosition; // Store initial position
        this.config = config;
        this.type = type;
        this.target = target;
        this.manager = manager; // Store reference to EnemyManager for callbacks

        this.mesh = null; // THREE.Object3D (Mesh or Group)
        this.body = null; // CANNON.Body

        this.health = this.config.health;
        this.speed = this.config.speed;
        this._isDead = false;

        // Attack timing
        this.attackCooldown = 0;
        this.attackRate = config.attackRate || 2.0; // Seconds between attacks
        this.attackDamage = config.attackDamage || 5; // Damage per attack
        this.attackRangeSq = 3 * 3; // Squared distance to target for attacking (adjust range)
    }

    init() {
        // --- Create Mesh ---
        if (this.assetData?.scene) {
            this.mesh = this.assetData.scene.clone(); // Clone placeholder or GLTF scene
            // Set mesh position initially based on the CENTER position passed from EnemyManager
            this.mesh.position.copy(this.initialPosition);
            // We will adjust the mesh's Y position *after* the physics body is created,
            // once we know the physics shape's halfHeight.

            // Apply scaling based on wave definition
            const scale = this.config.scale || 1.0; // Get scale from config (waveDef)
            this.mesh.scale.set(scale, scale, scale);

            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true; // Enemies likely receive shadows
            this.mesh.name = this.assetData.isPlaceholder ? `Placeholder_${this.type}_Instance` : `Loaded_${this.type}_Instance`;

            // Ensure unique material instance for this enemy
            if (this.mesh.isMesh && this.mesh.material) {
                // If it's a simple mesh, clone its material directly
                this.mesh.material = this.mesh.material.clone();
            } else if (this.mesh.isGroup) {
                // If it's a group (like from GLTF), traverse and clone materials on child meshes
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            // Clone material for each child mesh
                            child.material = child.material.clone();
                        }
                    }
                });
            }

            this.scene.add(this.mesh);
        } else {
            console.error(`Mesh scene missing for enemy type ${this.type}. Cannot initialize.`);
            // Optionally create a visible error marker in the scene
             const errorGeo = new THREE.BoxGeometry(1,1,1);
             const errorMat = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
             this.mesh = new THREE.Mesh(errorGeo, errorMat);
             this.mesh.position.copy(this.initialPosition);
             this.scene.add(this.mesh);
             this._isDead = true; // Mark as dead immediately if mesh fails
             return; // Stop initialization
        }

        // --- Create Physics Body ---
        console.log(`[Enemy.init - ${this.type}] Attempting to create physics body. Shape:`, this.shape); // Added Log
        const enemyMaterial = this.physicsInstance.getMaterial('enemy'); // Use physicsInstance to get material
        if (!this.shape || !enemyMaterial) {
             console.error(`[Enemy.init - ${this.type}] Cannot create physics body: Missing shape or material. Shape: ${this.shape}, Material: ${enemyMaterial}`); // Enhanced Log
              // Cleanup mesh if body creation fails
             if (this.mesh) this.scene.remove(this.mesh);
             this.mesh = null;
             this._isDead = true;
             return;
        }
        try { // Added try...catch around body creation
            this.body = new CANNON.Body({
                mass: 5,
                shape: this.shape, // Use the shape passed from EnemyManager
            material: enemyMaterial,
            // Set physics body position to the calculated CENTER position passed from EnemyManager
            position: new CANNON.Vec3(this.initialPosition.x, this.initialPosition.y, this.initialPosition.z),
            fixedRotation: true,
                linearDamping: 0.5
            });
            console.log(`[Enemy.init - ${this.type}] Physics body created successfully at center Y: ${this.initialPosition.y}.`, this.body);

            // --- Adjust Visual Mesh Position ---
            // Assuming the visual mesh origin is at its base, shift it down so its base aligns with the physics body's effective base (body.position.y - halfHeight)
            const physicsHalfHeight = this.shape.halfExtents.y;
            this.mesh.position.y -= physicsHalfHeight; // Adjust initial mesh position
            console.log(`[Enemy.init - ${this.type}] Adjusted mesh position Y to: ${this.mesh.position.y} (Center - ${physicsHalfHeight})`);

        } catch (bodyError) {
            console.error(`[Enemy.init - ${this.type}] CRITICAL ERROR creating CANNON.Body:`, bodyError);
            if (this.mesh) this.scene.remove(this.mesh);
            this.mesh = null;
            this._isDead = true;
            return; // Stop initialization on body creation failure
        }

        // Link mesh and body, add collision listener
        this.body.userData = { mesh: this.mesh, type: 'enemy', enemyInstance: this };
        this.mesh.userData = { body: this.body };
        // Add collision listener AFTER body is fully created and userData is set
        this.body.addEventListener('collide', this.handleCollision.bind(this));


        this.physicsInstance.addBody(this.body); // Use physicsInstance to add body
    }

    update(deltaTime, target) {
        if (this._isDead || !this.body || !this.mesh) return; // Exit if dead or improperly initialized

        // --- Cooldown Update ---
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // --- Movement ---
        const targetPosition = target.position; // CANNON.Vec3 expected if target is physics-based
        const currentPosition = this.body.position;
        const direction = new CANNON.Vec3();
        targetPosition.vsub(currentPosition, direction);

        const distanceToTargetSq = direction.lengthSquared(); // Use squared distance for checks

        // Check if close enough to attack OR if already very close (prevents oscillation)
        if (distanceToTargetSq <= this.attackRangeSq) {
            // --- Stop moving and Attack ---
             this.body.velocity.set(0, this.body.velocity.y, 0); // Stop horizontal movement, keep gravity effect
             this.attack(target); // Attempt attack (handles cooldown internally)
             // Face the target while attacking
             direction.y = 0;
             this.updateRotation(direction);

        } else {
             // --- Move Towards Target ---
             direction.y = 0; // Ignore height difference for movement direction
             direction.normalize();
             const desiredVelocity = direction.scale(this.speed);
             this.body.velocity.x = desiredVelocity.x;
             this.body.velocity.z = desiredVelocity.z;
             // Update rotation based on movement direction
             this.updateRotation(direction);
        }


        // --- Sync Mesh to Body ---
        // Add guards for safety
         if(this.mesh && this.body) {
             // Sync mesh position to body position, adjusting Y for the offset
             const bodyPos = this.body.position;
             const physicsHalfHeight = this.shape.halfExtents.y;
             this.mesh.position.set(bodyPos.x, bodyPos.y - physicsHalfHeight, bodyPos.z); // Base of mesh = Body Center - Half Height
             this.mesh.quaternion.copy(this.body.quaternion);
         }
    }

     updateRotation(direction) {
         if (direction.lengthSquared() > 0.01 && this.body) { // Check magnitude and body existence
            // Calculate angle in XZ plane
            const angle = Math.atan2(direction.x, direction.z);
            const targetQuaternion = new CANNON.Quaternion();
            targetQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);

            // Simple slerp for smoother rotation
            this.body.quaternion.slerp(targetQuaternion, 0.1, this.body.quaternion);
         }
     }

    handleCollision(event) {
        // Collision logic remains generally the same
        // Check if collided with the tower
        // Note: Tower collision damage is now handled primarily by the attack method based on range
        // This collision handler might be used for other interactions (e.g., hitting obstacles)
        const hitBody = event.body;
        if (hitBody?.userData?.type === 'tower') {
             // console.log(`${this.type} collided with tower physics body.`); // Optional log
             // Attack logic is now range-based in update()
        }
    }

    attack(target) {
        if (this._isDead || this.attackCooldown > 0 || !this.manager) return; // Check cooldown and manager reference

        console.log(`${this.type} attacking tower!`);
        this.audioManager.playSound('enemyAttack'); // Needs an 'enemyAttack' sound effect

        // Tell the EnemyManager to handle the damage application
        this.manager.handleTowerHit(this, this.attackDamage);

        // Reset cooldown
        this.attackCooldown = this.attackRate;

        // TODO: Play attack animation on the mesh
    }


    takeDamage(amount) {
        if (this._isDead) return;
        this.health -= amount;
        // console.log(`${this.type} took ${amount} damage. Health: ${this.health}`); // Less verbose
        this.audioManager.playSound('enemyHit');

        // Flash red effect (Example)
         if(this.mesh) {
            const originalColor = this.mesh.material.color.clone();
            this.mesh.material.color.set(0xff0000); // Set to red
             setTimeout(() => {
                if(this.mesh) this.mesh.material.color.copy(originalColor); // Revert after short delay
             }, 150); // 150ms flash
         }

        if (this.health <= 0) {
            this._isDead = true;
            // The manager will call die() in the next update loop when it detects isDead() is true
        }
    }

    isDead() {
        return this._isDead;
    }

    die() {
        // Called by EnemyManager when this enemy is removed
        // console.log(`${this.type} finalizing death.`); // Less verbose
        this.audioManager.playSound('enemyDie');

        // Remove physics body FIRST to stop collisions/updates
        if (this.body) {
             // Remove collision listener explicitly before removing body if needed (cannon-es might handle this)
             // this.body.removeEventListener('collide', this.handleCollision);
            this.physicsInstance.removeBody(this.body); // Use physicsInstance to remove body
            this.body = null; // Clear reference
        }
        // Remove mesh from scene and dispose resources
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Dispose geometry/material of the specific instance
            if (this.mesh.geometry) this.mesh.geometry.dispose();
             if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
             }
            this.mesh = null; // Clear reference
        }
        // Ensure flag is set, though manager checks this before calling die()
        this._isDead = true;
    }
}

export default Enemy;
