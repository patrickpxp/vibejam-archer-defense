// Ensure CANNON is available globally or import properly if using cannon-es
import * as CANNON from 'cannon-es';
import * as THREE from 'three'; // Needed for Debugger scene ref
import CannonDebugger from 'cannon-es-debugger'; // Import debugger

class Physics {
    constructor() {
        this.world = null;
        this.debugger = null; // Add debugger reference
        this.decorativeArrowBodies = []; // Keep track of decorative arrows
        this.timeStep = 1 / 60; // 60 FPS physics updates
        this.physicsMaterials = {}; // Store physics materials
        this.contactMaterials = []; // Store contact material interactions
    }

    // Update init to only accept the scene (for debugger)
    init(scene) { // Removed towerPhysicsInfo parameter
        if (!scene) {
            console.error("[Physics.init] Scene is required for debugger initialization.");
            return;
        }
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Standard gravity
        this.world.broadphase = new CANNON.NaiveBroadphase(); // Simple broadphase for now
        // this.world.solver.iterations = 10; // Adjust solver iterations if needed

        // Define some basic materials
        this.physicsMaterials.ground = new CANNON.Material("groundMaterial");
        this.physicsMaterials.player = new CANNON.Material("playerMaterial"); // Maybe for tower base
        this.physicsMaterials.enemy = new CANNON.Material("enemyMaterial");
        this.physicsMaterials.arrow = new CANNON.Material("arrowMaterial");
        this.physicsMaterials.quiver = new CANNON.Material("quiverMaterial"); // Added quiver material

        // Define interactions between materials (friction, restitution/bounciness)
        this.addContactMaterial(this.physicsMaterials.ground, this.physicsMaterials.enemy, 0.4, 0.1);
        this.addContactMaterial(this.physicsMaterials.ground, this.physicsMaterials.arrow, 0.1, 0.4);
        this.addContactMaterial(this.physicsMaterials.enemy, this.physicsMaterials.arrow, 0, 0); // No friction/bounce - handle via collision event
        this.addContactMaterial(this.physicsMaterials.player, this.physicsMaterials.enemy, 0.2, 0); // Enemies hitting tower
        this.addContactMaterial(this.physicsMaterials.player, this.physicsMaterials.quiver, 0.5, 0.1); // Quiver hitting tower (some friction, low bounce)
        this.addContactMaterial(this.physicsMaterials.ground, this.physicsMaterials.quiver, 0.6, 0.1); // Quiver hitting ground
        this.addContactMaterial(this.physicsMaterials.arrow, this.physicsMaterials.quiver, 0.1, 0.2); // Arrows hitting quiver

        // Add physics ground plane (matches visual ground but slightly lower?)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static
            material: this.physicsMaterials.ground
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate to match visual plane
        groundBody.position.set(0, -0.1, 0); // Slightly below visual mesh
        this.world.addBody(groundBody);

        // --- Add Tower Physics Body (Manual Dimensions) ---
        // Approximated dimensions based on visual inspection
        const towerWidth = 0.8;
        const towerDepth = 1.0;
        const towerHeight = 1.5; // Significantly taller

        const towerShape = new CANNON.Box(new CANNON.Vec3(towerWidth / 2, towerHeight / 2, towerDepth / 2));
        const towerPosition = new CANNON.Vec3(0, towerHeight / 2, 0); // Center the base at Y=0

        console.log(`[Physics.init] Using manually defined tower physics shape. Size: (${towerWidth}, ${towerHeight}, ${towerDepth}), Position: (0, ${towerHeight / 2}, 0)`);

        // Create the tower body
        const towerBody = new CANNON.Body({
            mass: 0, // Static tower base
            material: this.physicsMaterials.player, // Use player material for tower interactions
            shape: towerShape,
            position: towerPosition
        });
        towerBody.userData = { type: 'tower' }; // Add userData to identify the tower in collisions
        this.world.addBody(towerBody);
        this.towerBody = towerBody; // Keep a reference if needed
        // --- End Tower Physics Body ---


        // Initialize Debugger (Commented out)
        // this.debugger = new CannonDebugger(scene, this.world, {
        //      color: 0x00ff00, // Green wireframes
        //      scale: 1.0,
        // });
        // console.log("[Physics.init] Cannon debugger initialization."); // Commented out
    }

    addContactMaterial(mat1, mat2, friction, restitution) {
        const contactMat = new CANNON.ContactMaterial(mat1, mat2, {
            friction: friction,
            restitution: restitution
        });
        this.world.addContactMaterial(contactMat);
        this.contactMaterials.push(contactMat); // Keep track if needed
    }

    update(deltaTime) {
        if (!this.world) return;
        // Step the physics world
        this.world.step(this.timeStep, deltaTime, 3); // Max substeps = 3

        // Update the debugger (Commented out)
        // if (this.debugger) {
        //     this.debugger.update();
        // }
    }

    addBody(body) {
        if (this.world) {
            this.world.addBody(body);
        }
    }

    removeBody(body) {
         if (this.world) {
             // Remove collision listeners before removing body
             // Check if listener exists before removing
             if (body.collisionListener) {
                body.removeEventListener('collide', body.collisionListener);
                body.collisionListener = null; // Clear reference
             }
             this.world.removeBody(body);
         }
     }

    getWorld() {
        return this.world;
    }

    getMaterial(name) {
        return this.physicsMaterials[name];
    }

    // Creates a physics body for the quiver (initially dynamic)
    createQuiverBody(params) {
        const {
            quiverPosition, // {x, y, z} - World position from Game.js
            quiverQuaternion, // {x, y, z, w} - World rotation from Game.js
            quiverShapeParams // {width, height, depth} - From BoxGeometry
        } = params;

        if (!this.world || !quiverPosition || !quiverQuaternion || !quiverShapeParams) {
            console.error("[Physics] Missing parameters for createQuiverBody.");
            return null;
        }

         // --- Quiver Physics (Compound Shape: 1 bottom, 4 sides) ---
         try {
            const visualWidth = quiverShapeParams.width;
            const visualHeight = quiverShapeParams.height;
            const visualDepth = quiverShapeParams.depth;
            const wallThickness = 0.01; // Make walls thin

            const quiverBody = new CANNON.Body({
                mass: 0.5, // Give it some mass to fall
                 material: this.getMaterial('quiver'),
                 // Start slightly higher than visual position (origin is now center)
                 position: new CANNON.Vec3(quiverPosition.x, quiverPosition.y + 1.0, quiverPosition.z),
                 quaternion: new CANNON.Quaternion(quiverQuaternion.x, quiverQuaternion.y, quiverQuaternion.z, quiverQuaternion.w),
                 linearDamping: 0.3,
                 angularDamping: 0.3
             });

            // Bottom shape
            const bottomShape = new CANNON.Box(new CANNON.Vec3(visualWidth / 2, wallThickness / 2, visualDepth / 2));
            quiverBody.addShape(bottomShape, new CANNON.Vec3(0, -visualHeight / 2 + wallThickness / 2, 0)); // Offset to bottom

            // Side shapes (X+)
            const sideShapeX = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, visualHeight / 2, visualDepth / 2));
            quiverBody.addShape(sideShapeX, new CANNON.Vec3(visualWidth / 2 - wallThickness / 2, 0, 0)); // Offset to +X side

            // Side shapes (X-)
            quiverBody.addShape(sideShapeX, new CANNON.Vec3(-visualWidth / 2 + wallThickness / 2, 0, 0)); // Offset to -X side

            // Side shapes (Z+)
            const sideShapeZ = new CANNON.Box(new CANNON.Vec3(visualWidth / 2, visualHeight / 2, wallThickness / 2));
            quiverBody.addShape(sideShapeZ, new CANNON.Vec3(0, 0, visualDepth / 2 - wallThickness / 2)); // Offset to +Z side

            // Side shapes (Z-)
            quiverBody.addShape(sideShapeZ, new CANNON.Vec3(0, 0, -visualDepth / 2 + wallThickness / 2)); // Offset to -Z side


            this.addBody(quiverBody);
            console.log("[Physics] Added compound dynamic physics body for quiver.");
            return quiverBody; // Return the created body
         } catch (e) {
              console.error("[Physics] Error creating quiver physics body:", e);
              return null;
         }
    }

    // Creates dynamic physics bodies for decorative arrows
    addDynamicArrowBodies(params) {
        const {
            arrowShape, // CANNON.Shape instance
            arrowMaterial, // CANNON.Material instance
            numArrows,
            arrowInitialData // Array of { position: {x,y,z}, quaternion: {x,y,z,w} } - World coords
        } = params;

        if (!this.world || !arrowShape || !arrowMaterial || !arrowInitialData) {
            console.error("[Physics] Missing parameters for addDynamicArrowBodies.");
            return [];
        }

        this.decorativeArrowBodies = []; // Clear previous list before adding new ones
        const arrowBodies = [];
        for (let i = 0; i < numArrows; i++) {
            if (!arrowInitialData[i]) continue;

            try {
                const initialPos = arrowInitialData[i].position;
                const initialQuat = arrowInitialData[i].quaternion;

                const arrowBody = new CANNON.Body({
                    mass: 0.05,
                    shape: arrowShape,
                    material: arrowMaterial,
                    position: new CANNON.Vec3(initialPos.x, initialPos.y, initialPos.z),
                    quaternion: new CANNON.Quaternion(initialQuat.x, initialQuat.y, initialQuat.z, initialQuat.w)
                });
                arrowBody.angularDamping = 0.5;
                arrowBody.linearDamping = 0.5;
                arrowBody.sleepSpeedLimit = 0.5;
                arrowBody.sleepTimeLimit = 1.0;

                this.addBody(arrowBody);
                arrowBodies.push(arrowBody);
                this.decorativeArrowBodies.push(arrowBody); // Store reference for freezing
            } catch(e) {
                console.error(`[Physics] Error creating decorative arrow body ${i}:`, e);
            }
        }
        console.log(`[Physics] Added ${arrowBodies.length} dynamic physics bodies for decorative arrows.`);
        return arrowBodies;
    }

    // Helper to freeze a single body
    freezeBody(body) {
        if (body) {
            body.type = CANNON.Body.STATIC;
            body.velocity.setZero();
            body.angularVelocity.setZero();
            body.updateMassProperties();
        }
    }

    // Method to freeze all tracked decorative arrow bodies
    freezeDecorativeArrows() {
        console.log(`[Physics] Freezing ${this.decorativeArrowBodies.length} decorative arrow bodies.`);
        this.decorativeArrowBodies.forEach(body => this.freezeBody(body));
        // Clear the list after freezing if they won't be needed again
        // this.decorativeArrowBodies = [];
    }
}

export default Physics;
