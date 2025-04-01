// Requires Howler.js library (global 'Howl' or import)
import { Howl, Howler } from 'howler';

class AudioManager {
    constructor() {
        this.sounds = {}; // Store Howl instances
        this.isMuted = false; // Add basic mute functionality if needed
        this.masterVolume = 1.0; // Master volume control
    }

    init(assets) { // Receive loaded assets (which might include audio buffers/paths)
        // Define sounds used in the game
        const soundFiles = {
            'bowDraw': 'assets/audio/bow_draw.wav', // Example paths - replace
            'arrowShoot': 'assets/audio/arrow_shoot.wav',
            'arrowHit': 'assets/audio/arrow_hit.wav',
            'enemyHit': 'assets/audio/enemy_hit.wav',
            'enemyDie': 'assets/audio/enemy_die.wav',
            'playerHit': 'assets/audio/player_hit.wav',
            'towerHit': 'assets/audio/tower_hit.wav',
            // Add background music, UI sounds etc.
             'backgroundMusic': 'assets/audio/medieval_loop.mp3',
        };

        console.log("Initializing Audio Manager...");

        for (const key in soundFiles) {
            // Check if audio data is pre-loaded via AssetLoader (if it supports audio)
            // Otherwise, load directly using Howler path
             const srcPath = assets[key]?.src || soundFiles[key]; // Use preloaded source or default path

             if (!srcPath) {
                console.warn(`Audio source not found for key: ${key}`);
                continue;
             }

            // Create Howl instance
             this.sounds[key] = new Howl({
                 src: [srcPath], // Howler expects an array of sources
                 volume: this.getVolumeForKey(key), // Set initial volume based on type
                 loop: key === 'backgroundMusic', // Loop background music
                 // html5: true // Use HTML5 Audio to potentially save memory for long tracks? Test this.
             });
             console.log(`Loaded sound: ${key} from ${srcPath}`);
        }

        // Set global volume
        Howler.volume(this.masterVolume);

         // Start background music?
         // this.playSound('backgroundMusic');
    }

    getVolumeForKey(key) {
        // Set different default volumes for sound types
        if (key === 'backgroundMusic') return 0.3;
        if (key === 'arrowShoot') return 0.7;
        if (key === 'enemyDie') return 0.6;
        return 0.8; // Default volume for effects
    }

    playSound(key) {
        if (this.sounds[key] && !this.isMuted) {
            // console.log(`Playing sound: ${key}`); // Debug logging
            this.sounds[key].play();
        } else if (!this.sounds[key]) {
            console.warn(`Sound not found: ${key}`);
        }
    }

    stopSound(key) {
        if (this.sounds[key]) {
            this.sounds[key].stop();
        }
    }

    stopAllSounds() {
        Howler.stop(); // Stops all sounds managed by Howler
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        Howler.volume(this.masterVolume);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        Howler.mute(this.isMuted);
        console.log(`Audio Muted: ${this.isMuted}`);
    }

     // Add methods for spatial audio if needed (using Howler's pos() or StereoPannerNode)
     // playSpatialSound(key, x, y, z) { ... }
}

export default AudioManager;