// adaption of https://www.npmjs.com/package/html5-gamepad

import {MappedGamepad} from "./mappedGamepad";

export class GamepadManager {

    private _gamepads: MappedGamepad[] = [];

    constructor() {
        window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
            console.log('Controller connected', e.gamepad);
            this._gamepads[e.gamepad.index] = new MappedGamepad(e.gamepad);
        });
        window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
            console.log('Controller disconnected', e.gamepad);
            this._gamepads[e.gamepad.index] = undefined;
        });
    }

    update() {
        for (let i = 0; i < this._gamepads.length; i++) {
            if (this._gamepads[i])
                this._gamepads[i].updateGamepadState(navigator.getGamepads()[i]);
        }
    }

    getGamepadState(index: number) {
        if (!this._gamepads[index])
            throw new RangeError(`Gamepad with index ${index} was not found.`);

        this._gamepads[index].updateGamepadState(navigator.getGamepads()[index]);
        return this._gamepads[index];
    }

    isGamepadConnected(index: number) {
        return this._gamepads[index] !== undefined;
    }

}
