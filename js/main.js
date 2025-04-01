import Game from './modules/Game.js';

// Wait for the DOM to be fully loaded before starting the game
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    const game = new Game(canvas);

    game.init()
        .then(() => {
            console.log("Game initialized. Starting...");
            game.start(); // Start the game loop after initialization (incl. asset loading)
        })
        .catch(error => {
            console.error("Game initialization failed:", error);
            // Display error to user on the UI overlay
            const messageText = document.getElementById('messageText');
            const messageOverlay = document.getElementById('messageOverlay');
            if (messageText && messageOverlay) {
                messageText.textContent = `Error initializing game: ${error.message}. Please refresh.`;
                messageOverlay.classList.add('visible');
            }
        });

    // Handle potential restart
     const restartButton = document.getElementById('restartButton');
     if (restartButton) {
         restartButton.addEventListener('click', () => {
            window.location.reload(); // Simple way to restart
         });
     }
});