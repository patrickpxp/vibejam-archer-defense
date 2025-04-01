import * as THREE from 'three';
// Import GLTFLoader if using modules approach more formally
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Renderer {
    constructor(canvas, assetLoader) {
        this.canvas = canvas;
        this.assetLoader = assetLoader; // Store asset loader reference

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        // this.gltfLoader = new GLTFLoader(); // Initialize loader if using modules
    }

    init(assets) { // Receive loaded assets
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200); // Add fog

        // Camera (First Person Perspective)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        // Player position will set camera pos/rot in Player class

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true; // Enable shadows

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);

        // Basic Environment (Replace with GLTF)
        this.createPlaceholderEnvironment(assets);

        // Handle window resizing
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    createPlaceholderEnvironment(assets) {
         // Ground
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x556B2F, side: THREE.DoubleSide }); // Dark Olive Green
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Rotate to be flat
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Tower (Placeholder)
        const towerAsset = assets['tower']?.scene; // Get loaded tower model if available
        if (towerAsset) {
            // TODO: Configure and add the loaded GLTF model
            towerAsset.scale.set(1, 1, 1); // Adjust scale as needed
            towerAsset.position.set(0, 0, 0); // Position base at origin
             towerAsset.traverse((child) => { // Enable shadows for all parts
                 if (child.isMesh) {
                     child.castShadow = true;
                     child.receiveShadow = true;
                 }
             });
            this.scene.add(towerAsset);
            console.log("Loaded tower model added to scene.");
        } else {
            // Fallback placeholder geometry
            console.log("Using placeholder tower geometry.");
            const towerGeometry = new THREE.CylinderGeometry(5, 6, 15, 16); // Radius top, bottom, height, segments
            const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // Grey
            const tower = new THREE.Mesh(towerGeometry, towerMaterial);
            tower.position.y = 7.5; // Position base on the ground
            tower.castShadow = true;
            tower.receiveShadow = true;
            this.scene.add(tower);
        }
    }


    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    add(object) {
        if (this.scene) {
            this.scene.add(object);
        }
    }

    remove(object) {
        if (this.scene) {
            this.scene.remove(object);
             // Also dispose of geometry/material if it's temporary (like arrows)
             if (object.geometry) object.geometry.dispose();
             if (object.material) {
                 // Handle arrays of materials
                 if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                 } else {
                    object.material.dispose();
                 }
             }
        }
    }
}

export default Renderer;