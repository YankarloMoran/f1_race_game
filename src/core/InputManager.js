export class InputManager {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false,
      drs: false,
      escape: false,
      toggleRain: false
    };

    this._escapePressed = false;
    this._rainPressed = false;

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.keys.forward = true; break;
      case 'ArrowDown':
      case 'KeyS': this.keys.backward = true; break;
      case 'ArrowLeft':
      case 'KeyA': this.keys.left = true; break;
      case 'ArrowRight':
      case 'KeyD': this.keys.right = true; break;
      case 'Space': this.keys.brake = true; break;
      case 'KeyE':
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.drs = true; break;
      case 'Escape':
        if (!this._escapePressed) {
          this.keys.escape = true;
          this._escapePressed = true;
        }
        break;
      case 'KeyR':
        if (!this._rainPressed) {
          this.keys.toggleRain = true;
          this._rainPressed = true;
        }
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.keys.forward = false; break;
      case 'ArrowDown':
      case 'KeyS': this.keys.backward = false; break;
      case 'ArrowLeft':
      case 'KeyA': this.keys.left = false; break;
      case 'ArrowRight':
      case 'KeyD': this.keys.right = false; break;
      case 'Space': this.keys.brake = false; break;
      case 'KeyE':
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.drs = false; break;
      case 'Escape': this._escapePressed = false; break;
      case 'KeyR': this._rainPressed = false; break;
    }
  }

  consumeEscape() {
    if (this.keys.escape) {
      this.keys.escape = false;
      return true;
    }
    return false;
  }

  consumeRainToggle() {
    if (this.keys.toggleRain) {
      this.keys.toggleRain = false;
      return true;
    }
    return false;
  }
}
