import * as THREE from 'three';

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouse = {
            x: 0,
            y: 0,
            screenX: 0, // Raw screen coords
            screenY: 0,
            isDown: false,
            isDragging: false, // Added for potential drag actions
            downTime: 0, // Time mouse was pressed down
        };
        this.keys = {}; // Store state of keyboard keys
        this.isEnabled = true;

        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundKeyUp = this._onKeyUp.bind(this);
        this._boundPointerLockChange = this._onPointerLockChange.bind(this);
        this._boundContextMenu = this._onContextMenu.bind(this);


        this.requestPointerLock();
        this.addEventListeners();
    }

    requestPointerLock() {
         this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
                                        this.canvas.mozRequestPointerLock ||
                                        this.canvas.webkitRequestPointerLock;
         this.canvas.addEventListener('click', () => {
             if (this.isEnabled && document.pointerLockElement !== this.canvas) {
                 this.canvas.requestPointerLock();
             }
         });
         document.addEventListener('pointerlockchange', this._boundPointerLockChange, false);
         document.addEventListener('mozpointerlockchange', this._boundPointerLockChange, false);
         document.addEventListener('webkitpointerlockchange', this._boundPointerLockChange, false);
     }

     _onPointerLockChange() {
         if (document.pointerLockElement === this.canvas ||
             document.mozPointerLockElement === this.canvas ||
             document.webkitPointerLockElement === this.canvas) {
             console.log('Pointer Lock active.');
             // Re-attach mouse move listener specifically for pointer lock
             document.addEventListener("mousemove", this._boundMouseMove, false);
         } else {
             console.log('Pointer Lock released.');
             // Remove the document-level listener when lock is lost
             document.removeEventListener("mousemove", this._boundMouseMove, false);
             // Optional: Pause game or show message?
         }
     }

    addEventListeners() {
        // Mouse listeners (down/up on canvas, move handled by pointer lock change)
        this.canvas.addEventListener('mousedown', this._boundMouseDown, false);
        this.canvas.addEventListener('mouseup', this._boundMouseUp, false);
        // Keyboard listeners
        window.addEventListener('keydown', this._boundKeyDown, false);
        window.addEventListener('keyup', this._boundKeyUp, false);
        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', this._boundContextMenu, false);

    }

    removeEventListeners() {
        this.canvas.removeEventListener('mousedown', this._boundMouseDown);
        this.canvas.removeEventListener('mouseup', this._boundMouseUp);
        window.removeEventListener('keydown', this._boundKeyDown);
        window.removeEventListener('keyup', this._boundKeyUp);
        this.canvas.removeEventListener('contextmenu', this._boundContextMenu);
        document.removeEventListener('pointerlockchange', this._boundPointerLockChange);
        document.removeEventListener('mozpointerlockchange', this._boundPointerLockChange);
        document.removeEventListener('webkitpointerlockchange', this._boundPointerLockChange);
        document.removeEventListener("mousemove", this._boundMouseMove); // Ensure removal

    }

    _onMouseMove(event) {
        if (!this.isEnabled || document.pointerLockElement !== this.canvas) return;

        // Use movementX/Y for pointer lock relative movement
         this.mouse.x = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
         this.mouse.y = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

         // Keep track of screen coords if needed, though less useful in pointer lock
         this.mouse.screenX = event.clientX;
         this.mouse.screenY = event.clientY;

         if(this.mouse.isDown) {
             this.mouse.isDragging = true;
         }
    }

    _onMouseDown(event) {
        if (!this.isEnabled) return;
        // event.button === 0 for left click, 2 for right click
        if (event.button === 0) { // Left mouse button
            this.mouse.isDown = true;
            this.mouse.isDragging = false;
            this.mouse.downTime = performance.now();
        }
         // Handle other buttons if needed (e.g., right click for alternative action)
    }

    _onMouseUp(event) {
        if (!this.isEnabled) return;
        if (event.button === 0) { // Left mouse button
            this.mouse.isDown = false;
            this.mouse.isDragging = false;
        }
         // Handle other buttons if needed
    }

    _onKeyDown(event) {
        if (!this.isEnabled) return;
        this.keys[event.code] = true;
        // console.log(event.code + " down"); // For debugging key codes
    }

    _onKeyUp(event) {
        if (!this.isEnabled) return;
        this.keys[event.code] = false;
    }

     _onContextMenu(event) {
         event.preventDefault(); // Prevent right-click menu
     }


    // --- Public Methods to Query State ---

    getMouseMovement() {
        // Return relative movement since last frame and reset
        const movement = { x: this.mouse.x, y: this.mouse.y };
        // Reset accumulated movement for next frame's calculation
        this.mouse.x = 0;
        this.mouse.y = 0;
        return movement;
    }

    isMouseButtonDown() {
        return this.mouse.isDown;
    }

     getMouseButtonDownTime() {
         return this.mouse.isDown ? (performance.now() - this.mouse.downTime) / 1000 : 0; // Time in seconds
     }

    isKeyPressed(keyCode) {
        return this.keys[keyCode] === true;
    }

    update() {
        // Could add polling logic here if needed, but typically event-driven is sufficient
        // Reset single-frame states if necessary
    }

    enable() {
        this.isEnabled = true;
         // Re-request pointer lock if needed? Or assume it's still locked?
         if (document.pointerLockElement !== this.canvas) {
             // this.requestPointerLock(); // Might need user interaction again
         }
    }

    disable() {
        this.isEnabled = false;
        // Release pointer lock when disabling controls
        document.exitPointerLock = document.exitPointerLock ||
                                   document.mozExitPointerLock ||
                                   document.webkitExitPointerLock;
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
        // Reset state
        this.mouse.isDown = false;
        this.mouse.isDragging = false;
        this.keys = {};
    }
}

export default InputManager;