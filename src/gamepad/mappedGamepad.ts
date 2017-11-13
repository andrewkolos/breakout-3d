import mappings = require('html5-gamepad/mappings');

export enum GAMEPAD_BUTTON {
    BOTTOM_FACE_BUTTON = "a",
    LEFT_FACE_BUTTON = "x",
    TOP_FACE_BUTTON = "y",
    RIGHT_FACE_BUTTON = "b",
    LEFT_BUMPER = "left shoulder",
    RIGHT_BUMPER = "right shoulder",
    SELECT = "back",
    START = "start",
    HOME = "home",
    LEFT_STICK = "left stick",
    RIGHT_STICK = "right stick",
    RIGHT_TRIGGER = "right trigger",
    LEFT_TRIGGER = "left trigger"
}

export enum GAMEPAD_AXES {
    LEFT_STICK_X = "left stick x",
    LEFT_STICK_Y = "left stick y",
    RIGHT_STICK_X = "right stick x",
    RIGHT_STICK_Y = "left stick y",
    DPAD_X = "dpad x",
    DPAD_Y = "dpad y",
    LEFT_TRIGGER = "left trigger",
    RIGHT_TRIGGER = "right trigger"
}

export class MappedGamepad {

    private mapping: any;
    private gamepad: Gamepad;

    constructor(gamepad: Gamepad) {
        this.mapping = detectMapping(gamepad.id, navigator.userAgent);
        this.axis = this.axis.bind(this);
        this.gamepad = gamepad;
    }

    updateGamepadState(gamepad: Gamepad) {
        this.gamepad = gamepad;
    }

    axis(name: GAMEPAD_AXES) {
        let mapping = this.mapping.axes[name];
        if (!mapping) {
            return 0;
        }
        if (mapping.index !== undefined) {
            let index = mapping.index;
            return this.gamepad.axes[index];
        }
        if (mapping.buttonPositive !== undefined && this.gamepad.buttons[mapping.buttonPositive].pressed) {
            return 1;
        }
        if (mapping.buttonNegative !== undefined && this.gamepad.buttons[mapping.buttonNegative].pressed) {
            return -1;
        }
        return 0;
    }

    button(name: GAMEPAD_BUTTON) {
        let mapping = this.mapping.buttons[name];
        if (!mapping) {
            return false;
        }
        if (mapping.index !== undefined) {
            return this.gamepad.buttons[mapping.index].pressed;
        }
        if (mapping.axis !== undefined) {
            if (mapping.direction < 0) {
                return this.gamepad.axes[mapping.axis] < -0.75;
            } else {
                return this.gamepad.axes[mapping.axis] > 0.75;
            }
        }
        return false;
    };
}

function detectMapping (id: string, browser: string) {
    function isCompatible(mapping, id, browser) {
        for (let i = 0; i < mapping.supported.length; i++) {
            let supported = mapping.supported[i];

            if (id.indexOf(supported.id) !== -1
                && browser.indexOf(supported.os) !== -1
                && browser.indexOf(browser) !== -1) {
                return true;
            }
        }
        return false;
    }

    for (let i = 0; i < mappings.length; i++) {
        if (isCompatible(mappings[i], id, browser)) {
            console.log("found mapping", mappings[i].name, "for", id, "on", browser);
            return clone(mappings[i]);
        }
    }
    console.warn("no mapping found, using default for", id, "on", browser);
    return clone(mappings[0]);
}


function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}


