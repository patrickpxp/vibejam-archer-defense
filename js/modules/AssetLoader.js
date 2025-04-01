import * as THREE from 'three';
// Must include GLTFLoader separately if not using build tools/modules properly
// Assume GLTFLoader is available globally or imported if using modules
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { Howl } from 'howler'; // Import Howl if preloading audio buffers

class AssetLoader {
    constructor() {
        // Use the built-in Three.js loaders
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        // this.audioLoader = new THREE.AudioLoader(); // For Three.js audio if not using Howler preloading

        this.assets = {}; // Store loaded assets { key: loadedObject }
        this.assetsToLoad = { // Define assets to load { key: path }
            // Models
            'tower': 'assets/models/building_tower_base_red.gltf', // Replace with your actual paths
            'bow': null,
            'arrow': null,
            'quiver': null, // Added for decoration
            'goblin': null,
            'orc': null, // Example additional enemy

            // Textures (Example)
            // 'groundTexture': 'assets/textures/grass.jpg',

            // Audio (Using Howler directly for loading is often simpler)
            // If preloading with Howler is desired, do it in AudioManager
            // Or load paths here for AudioManager to use
             'bowDraw': 'assets/audio/bow_draw.wav',
             'arrowShoot': 'assets/audio/arrow_shoot.wav',
             'arrowHit': 'assets/audio/arrow_hit.wav',
             'enemyHit': 'assets/audio/enemy_hit.wav',
             'enemyDie': 'assets/audio/enemy_die.wav',
             'playerHit': 'assets/audio/player_hit.wav',
             'towerHit': 'assets/audio/tower_hit.wav',
             'backgroundMusic': 'assets/audio/medieval_loop.mp3',
        };
        this.totalAssets = Object.keys(this.assetsToLoad).length;
        this.loadedAssetsCount = 0;
    }

    loadAll() {
        console.log(`Starting asset loading... Total: ${this.totalAssets}`);
        const loadPromises = [];

        for (const key in this.assetsToLoad) {
            const path = this.assetsToLoad[key];
            const pathOrPlaceholder = path;
            let promise = null;

            if (typeof pathOrPlaceholder === 'string') {

            if (path.endsWith('.gltf') || path.endsWith('.glb')) {
                promise = this.loadGLTF(key, path);
            } else if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg')) {
                promise = this.loadTexture(key, path);
            } else if (path.endsWith('.wav') || path.endsWith('.mp3') || path.endsWith('.ogg')) {
                 // Store path for Howler, don't load data here unless needed
                 promise = this.registerAudioPath(key, path);
            }
             // Add more types as needed (e.g., JSON, Font)
        } else if (pathOrPlaceholder === null) {
            // It's a placeholder request
            promise = this.generatePlaceholder(key); // Generate placeholder mesh
        } else {
            console.warn(`Invalid asset definition for key: ${key}`);
            this.totalAssets--; // Adjust total
        }

        if (promise) {
            loadPromises.push(promise.catch(error => {
                // Catch individual load/generation errors to allow Promise.all to finish
                console.error(`Failed to load/generate asset "${key}":`, error);
                // Optionally mark this asset as failed in the this.assets dictionary
                this.assets[key] = { failed: true, error: error };
            }));
        }
    }

        return Promise.all(loadPromises)
            .then(() => {
                const failedCount = Object.values(this.assets).filter(a => a?.failed).length;
                if(failedCount > 0) {
                    console.warn(`${failedCount} asset(s) failed to load/generate.`);
                }
                console.log("Asset loading/generation process complete.");
                this.displayLoadingProgress(1); // Ensure progress shows 100%
                return this.assets; // Return all assets (loaded or placeholder or failed)
            })
            .catch(error => {
                // This catch might not be reached if individual errors are caught above,
                // but good practice to keep it for Promise.all level errors.
                console.error("Error during the overall asset loading process:", error);
                throw error; // Re-throw error
            });
    }
// --- Placeholder Generation ---
generatePlaceholder(key) {
    return new Promise((resolve) => {
        console.log(`Generating placeholder for: ${key}`);
        let placeholderMesh = null;
        let geometry, material;
        const placeholderColor = 0xcccccc; // Default grey

        switch (key) {
            case 'bow':
                geometry = new THREE.BoxGeometry(0.1, 1.2, 0.1); // Slightly taller box
                material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
                placeholderMesh = new THREE.Mesh(geometry, material);
                placeholderMesh.name = "Placeholder_Bow";
                break;
            case 'arrow':
                // Create a group for the composite arrow placeholder
                const arrowGroup = new THREE.Group();
                arrowGroup.name = "Placeholder_Arrow";

                // Define materials
                const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
                const headMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Grey
                const fletchingMaterial = new THREE.MeshStandardMaterial({ color: 0xF0F0F0, side: THREE.DoubleSide }); // Light Grey, double-sided

                // --- Arrow Dimensions (Reduced lengths by further 30%) ---
                const shaftLength = 0.147; // Further Reduced Length
                const shaftRadius = 0.007; // Kept small
                const headLength = 0.0245; // Further Reduced Length
                const headRadius = 0.0105; // Kept small
                const fletchingLength = 0.0343; // Further Reduced Length
                const fletchingHeight = 0.0175; // Kept small
                const fletchingThickness = 0.0021; // Kept small

                // Shaft (Cylinder along Z-axis)
                const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 6); // Fewer segments
                const shaftMesh = new THREE.Mesh(shaftGeo, shaftMaterial);
                shaftMesh.rotation.x = Math.PI / 2; // Rotate to align with Z
                shaftMesh.position.z = (headLength - shaftLength) / 2; // Position behind the head
                arrowGroup.add(shaftMesh);

                // Arrowhead (Cone pointing along +Z)
                const headGeo = new THREE.ConeGeometry(headRadius, headLength, 6); // Fewer segments
                const headMesh = new THREE.Mesh(headGeo, headMaterial);
                headMesh.rotation.x = Math.PI / 2; // Rotate to align with Z
                headMesh.position.z = headLength / 2; // Position at the front
                arrowGroup.add(headMesh);

                // Fletching (3 planes/boxes at the back)
                // Swap thickness and height so height points radially after rotation
                const fletchingGeo = new THREE.BoxGeometry(fletchingHeight, fletchingThickness, fletchingLength);
                for (let i = 0; i < 3; i++) {
                    const fletchingMesh = new THREE.Mesh(fletchingGeo, fletchingMaterial); // Re-use geometry, new mesh per fletch
                    const angle = (i / 3) * Math.PI * 2;
                    fletchingMesh.rotation.z = angle; // Rotate around the shaft axis
                    // Position slightly offset radially and at the back of the shaft
                    const radialOffset = shaftRadius + fletchingHeight / 2;
                    fletchingMesh.position.set(
                        Math.cos(angle) * radialOffset * 0.1, // Small radial offset for visual separation
                        Math.sin(angle) * radialOffset * 0.1,
                        // Position fletching center at the back end of the shaft
                        (headLength / 2 - shaftLength) - (fletchingLength / 2) // shaft_back_end - fletching_half_length
                    );
                     // No extra rotation needed here, BoxGeometry length aligns with Z by default
                    arrowGroup.add(fletchingMesh);
                }

                // Nock (implied by shaft end)

                // IMPORTANT: Orient the *entire group* correctly for shooting (e.g., point down Z-axis if physics expects that)
                // The current shooting logic seems to expect the arrow pointing along the camera's forward vector,
                // which is typically -Z in camera space. Our arrow is built pointing +Z locally.
                // The original placeholder was rotated PI/2 on X. Let's keep that convention for the group.
                // Calculate bounds *before* the final orientation rotation
                const unrotatedBounds = new THREE.Box3().setFromObject(arrowGroup);
                const unrotatedSize = unrotatedBounds.getSize(new THREE.Vector3());

                // IMPORTANT: Orient the *entire group* correctly for shooting
                arrowGroup.rotation.x = Math.PI / 2;

                placeholderMesh = arrowGroup; // Assign the rotated group as the placeholder mesh

                // Store the unrotated size along with the scene for physics shape creation later
                this.assets[key] = {
                     scene: placeholderMesh,
                     isPlaceholder: true,
                     unrotatedSize: unrotatedSize // Store pre-rotation dimensions
                };
                this.assetLoaded(); // Mark as loaded for progress tracking
                resolve(this.assets[key]); // Resolve the promise with the asset data
                return; // Exit early as we've handled storing the asset here
            case 'quiver':
                // Simple Box placeholder for the quiver visual (Reduced size by 50%)
                const quiverWidth = 0.1; // Reduced from 0.2
                const quiverHeight = 0.2; // Reduced from 0.4
                const quiverDepth = 0.1; // Reduced from 0.2
                geometry = new THREE.BoxGeometry(quiverWidth, quiverHeight, quiverDepth);
                material = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Darker Brown
                placeholderMesh = new THREE.Mesh(geometry, material);
                // DO NOT translate geometry; keep origin at the center to match physics body
                placeholderMesh.name = "Placeholder_Quiver";
                break;
            case 'goblin':
                 // Use a capsule for a more organic shape
                geometry = new THREE.CapsuleGeometry(0.4, 0.7, 4, 8); // radius, length, capSegments, radialSegments
                material = new THREE.MeshStandardMaterial({ color: 0x2E8B57 }); // Sea Green
                placeholderMesh = new THREE.Mesh(geometry, material);
                // By default, CapsuleGeometry is centered. Translate it so its base is at y=0.
                placeholderMesh.geometry.translate(0, 0.7 / 2 + 0.4, 0); // Translate up by half-length + radius
                placeholderMesh.name = "Placeholder_Goblin";
                break;
            case 'orc':
                geometry = new THREE.CapsuleGeometry(0.6, 1.0, 4, 8);
                material = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark Red
                placeholderMesh = new THREE.Mesh(geometry, material);
                placeholderMesh.geometry.translate(0, 1.0 / 2 + 0.6, 0);
                placeholderMesh.name = "Placeholder_Orc";
                break;
            default:
                console.warn(`No placeholder definition for key: ${key}`);
                // Resolve without adding to assets, but count as "loaded" for progress
                this.assetLoaded();
                resolve(null);
                return; // Exit early
        }

        // Common properties for generated placeholders
        // This part is now unreachable for the 'arrow' case due to the return above
        // Keep it for other cases
        if (placeholderMesh) { // Check if placeholderMesh was created (might not be for 'default' case)
            placeholderMesh.castShadow = true;
            placeholderMesh.receiveShadow = true;

            // Store consistently with loaded assets: { scene: Mesh, isPlaceholder: true }
            this.assets[key] = {
                 scene: placeholderMesh,
                 isPlaceholder: true
            };
            this.assetLoaded(); // Mark as loaded for progress tracking
            resolve(this.assets[key]); // Resolve the promise with the asset data
        }
        // If placeholderMesh is null (e.g., 'default' case), resolve was already called earlier
    });
}
     loadGLTF(key, path) {
         return new Promise((resolve, reject) => {
             this.gltfLoader.load(path,
                 (gltf) => {
                     this.assets[key] = gltf; // Store the whole GLTF object (scene, animations etc)
                     console.log(`Loaded GLTF: ${key}`);
                     this.assetLoaded();
                     resolve(gltf);
                 },
                 (xhr) => { // Progress callback (optional)
                     // console.log(`${key} ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`);
                 },
                 (error) => {
                     console.error(`Failed to load GLTF ${key} from ${path}:`, error);
                     reject(error);
                 }
             );
         });
     }

     loadTexture(key, path) {
         return new Promise((resolve, reject) => {
             this.textureLoader.load(path,
                 (texture) => {
                     this.assets[key] = texture;
                     console.log(`Loaded Texture: ${key}`);
                     this.assetLoaded();
                     resolve(texture);
                 },
                 undefined, // Progress callback (optional, often not provided for textures)
                 (error) => {
                     console.error(`Failed to load Texture ${key} from ${path}:`, error);
                     reject(error);
                 }
             );
         });
     }

     registerAudioPath(key, path) {
        // Simply store the path for Howler to use later
        // Resolve immediately as we aren't loading data here
         return new Promise((resolve) => {
            this.assets[key] = { src: path, type: 'audioPath' }; // Store path info
            console.log(`Registered audio path: ${key}`);
            this.assetLoaded();
            resolve(this.assets[key]);
         });
     }

     assetLoaded() {
        this.loadedAssetsCount++;
        // Ensure totalAssets is not zero before dividing
        const progress = this.totalAssets > 0 ? (this.loadedAssetsCount / this.totalAssets) : 1;
        this.displayLoadingProgress(progress);
    }

    displayLoadingProgress(progress) {
        // Example: Update a loading bar element
         const loadingBarElement = document.getElementById('loadingBar'); // Assume you add this to HTML
         const loadingTextElement = document.getElementById('loadingText');
         if (loadingBarElement) {
             loadingBarElement.style.width = `${progress * 100}%`;
         }
         if (loadingTextElement) {
             loadingTextElement.textContent = `Loading... ${Math.round(progress * 100)}%`;
         }
          // Hide loading overlay when complete (progress >= 1)
          const loadingOverlay = document.getElementById('loadingOverlay'); // Add to HTML
          if (progress >= 1 && loadingOverlay) {
             // Add a small delay for visual satisfaction?
             setTimeout(() => { loadingOverlay.style.display = 'none'; }, 200);
          }
    }


    getAsset(key) {
        return this.assets[key];
    }

     getAssets() {
         return this.assets;
     }
}

export default AssetLoader;
