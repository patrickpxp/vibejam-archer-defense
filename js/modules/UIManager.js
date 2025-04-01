class UIManager {
    constructor() {
        // Get references to UI elements
        this.towerHealthEl = document.getElementById('towerHealth');
        // Removed playerHealthEl reference
        this.waveNumberEl = document.getElementById('waveNumber');
        this.scoreEl = document.getElementById('score');
        // Removed resourcesEl reference
        // Removed upgradeButton reference
        this.messageOverlay = document.getElementById('messageOverlay');
        this.messageText = document.getElementById('messageText');
        this.restartButton = document.getElementById('restartButton');

        this.messageTimeout = null; // To clear previous message timeouts
    }

    update(gameState) {
        if (!gameState) return;

        this.updateElement(this.towerHealthEl, Math.max(0, gameState.towerHealth)); // Ensure non-negative
        // Removed playerHealthEl update
        this.updateElement(this.waveNumberEl, gameState.currentWave);
        this.updateElement(this.scoreEl, gameState.score);
        // Removed resourcesEl update

        // Removed upgrade button logic

    }

    // Helper to safely update text content
    updateElement(element, value) {
        if (element && element.textContent !== String(value)) {
            element.textContent = value;
        }
    }

    showMessage(message, duration = 3000) {
        if (!this.messageOverlay || !this.messageText) return;

        this.messageText.textContent = message;
        this.messageOverlay.classList.add('visible');
        this.restartButton.style.display = 'none'; // Hide restart button for temporary messages


        // Clear previous timeout if one exists
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        // Hide message after duration (if duration is provided)
        if (duration > 0) {
            this.messageTimeout = setTimeout(() => {
                this.messageOverlay.classList.remove('visible');
                this.messageTimeout = null; // Clear the timeout reference
            }, duration);
        }
    }

    showGameOver(message) {
         if (!this.messageOverlay || !this.messageText || !this.restartButton) return;

         // Clear any temporary message timeout
         if (this.messageTimeout) {
             clearTimeout(this.messageTimeout);
             this.messageTimeout = null;
         }

         this.messageText.textContent = `GAME OVER: ${message}`;
         this.restartButton.style.display = 'block'; // Show restart button
         this.messageOverlay.classList.add('visible'); // Ensure overlay is visible
    }
}

export default UIManager;
