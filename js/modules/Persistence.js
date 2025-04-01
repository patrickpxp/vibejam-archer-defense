class Persistence {
    constructor(storageKey = 'archersDefenseSave') {
        this.storageKey = storageKey;
    }

    saveGame(gameState) {
        if (!gameState) {
            console.warn("Attempted to save null or undefined game state.");
            return;
        }
        try {
            // Select only the data needed for saving progress
            const saveData = {
                playerHealth: gameState.playerHealth,
                towerHealth: gameState.towerHealth,
                score: gameState.score,
                resources: gameState.resources,
                currentWave: gameState.currentWave, // Save the index of the *next* wave to start
                // Add purchased upgrades here, e.g., gameState.upgrades
            };
            const dataString = JSON.stringify(saveData);
            localStorage.setItem(this.storageKey, dataString);
            console.log("Game state saved:", saveData);
        } catch (error) {
            console.error("Failed to save game state to Local Storage:", error);
            // Handle potential storage quota exceeded errors
        }
    }

    loadGame() {
        try {
            const dataString = localStorage.getItem(this.storageKey);
            if (dataString) {
                const loadedData = JSON.parse(dataString);
                console.log("Game state loaded:", loadedData);
                return loadedData;
            } else {
                console.log("No saved game state found.");
                return null; // No save data exists
            }
        } catch (error) {
            console.error("Failed to load game state from Local Storage:", error);
            // If parsing fails, the saved data might be corrupted. Clear it?
             // this.clearSave();
            return null;
        }
    }

    clearSave() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log("Saved game state cleared.");
        } catch (error) {
            console.error("Failed to clear game state from Local Storage:", error);
        }
    }
}

export default Persistence;