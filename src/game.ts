import {createTickWrapper} from "./util/tickWrapper";
import {BreakoutLevelBlueprint, Brick, Point} from "./level/breakoutLevelBlueprint";
import * as THREE from 'three';
import {BufferGeometry, Intersection, SphereBufferGeometry, Vector3} from "three";
import {GamepadManager} from "./gamepad/gamepadManager";
import {GAMEPAD_AXES} from "./gamepad/mappedGamepad";
import Keyboard from './util/keyboard';

let manager = new GamepadManager();

export class BreakoutGame {

    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;

    private level: BreakoutLevel;

    private topWallBoxes = <THREE.Box3[]> [];
    private sideWallBoxes = <THREE.Box3[]> [];

    private _speedModifier: number;

    get gameSpeed() {
        return this._speedModifier / this._updatesPerSecond;
    }

    set gameSpeed(value: number) {
        this._speedModifier = value / this._updatesPerSecond;
    }

    private _running: boolean = false;
    private _updatesPerSecond: number;

    get updatesPerSecond() {
        return this._updatesPerSecond;
    }

    set updatesPerSecond(value: number) {
        this._speedModifier = this._updatesPerSecond / value;
        if (this._running) {
            this.update = createTickWrapper(value, this.update);
        }
        this._updatesPerSecond = value;
    }

    get running() {
        return this._running;
    }

    constructor(updatesPerSecond: number, speedModifier: number = 1) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, -20, 20);
        this._updatesPerSecond = updatesPerSecond;
        this.gameSpeed = speedModifier;
        this.scene.add(new THREE.AmbientLight('white', 1));
    }


    update = () => {
        let handleCollisions = () => {
            this.level.ballObjects.forEach(bo => {
                let collided = false;

                let prevPosition = bo.position.clone();
                bo.position.add(bo.velocity);
                let ballBox = new THREE.Box3().setFromObject(bo);
                for (let i = 0; i < this.topWallBoxes.length; i++) {
                    let twb =  this.topWallBoxes[i];
                    if (twb.intersectsBox(ballBox)) {
                        if (!bo.colliding) {
                            bo.velocity.y *= -1;
                            bo.position.copy(prevPosition);
                            bo.position.add(bo.velocity);

                            console.log('joj');
                            bo.colliding = true;

                        }
                        collided = true;
                    }
                }
                for (let i = 0; i < this.sideWallBoxes.length; i++) {
                    let swb =  this.sideWallBoxes[i];
                    if (swb.intersectsBox(ballBox)) {

                        if (!bo.colliding) {
                            bo.velocity.x *= -1;
                            bo.position.copy(prevPosition);
                            bo.position.add(bo.velocity);

                            console.log('joj');
                            bo.colliding = true;
                        }
                        collided = true;
                    }
                }

                if (!collided) {
                    console.log('hi');
                    bo.colliding = false;
                }
            });
        };

        handleCollisions();

        if (Keyboard.isDown(Keyboard.LEFTARROW)) {

            this.level.paddle.position.x -= 0.01;
        }

        if (Keyboard.isDown(Keyboard.RIGHTARROW)) {
            this.level.paddle.position.x += 0.01;
        }

        if (manager.isGamepadConnected(0)) {
            let gp = manager.getGamepadState(0);
            if (gp.axis(GAMEPAD_AXES.LEFT_STICK_Y) < -0.5)
                this.level.paddle.position.x -= 0.1;
        }
    };

    loadLevel = (blueprint: BreakoutLevelBlueprint) => {
        this.level = new BreakoutLevel(blueprint);
        this.level.ballObjects.forEach(ballo => {
            this.scene.add(ballo);
            ballo.velocity = new THREE.Vector3(this._speedModifier * 2, this._speedModifier * 2, 0);
        });
        this.level.brickObjects.forEach(bricko => this.scene.add(bricko));
        this.level.paddleBoundaries.forEach(pb => this.scene.add(pb));
        this.level.topWalls.forEach(wall => {
            this.scene.add(wall);
            this.topWallBoxes.push(new THREE.Box3().setFromObject(wall));
        });
        this.level.sideWalls.forEach(wall => {
            this.scene.add(wall);
            this.sideWallBoxes.push(new THREE.Box3().setFromObject(wall));
        });
        this.scene.add(this.level.paddle);
    };

    stop = () => {
        this._running = false;
    };

    start = () => {
        this.update = createTickWrapper(this._updatesPerSecond, this.update);
        this._running = true;
    };
}


class BreakoutLevel {
    static readonly HEALTH_COLOR_SCHEME = [0x00f5ec, 0x00f582, 0x00f50c, 0x8af500, 0xe9f500, 0x99ff00, 0xffff00, 0xff9d00, 0xff5400, 0xff0000];

    brickObjects = <BrickObject[]> [];
    paddle: PaddleObject;
    ballObjects = <BallObject[]> [];
    paddleBoundaries = <PaddleBoundaryObject[]> [];
    topWalls = <WallObject[]> [];
    sideWalls = <WallObject[]> [];

    constructor(blueprint: BreakoutLevelBlueprint) {

        let createBrickObject = (brick: Brick) => {
            let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshPhongMaterial({color: BreakoutLevel.HEALTH_COLOR_SCHEME[brick.health]});
            let bo = new BrickObject(geometry, material, brick.health);
            bo.position.copy(convertScreenToCartesian(brick.location.x, brick.location.y, blueprint.width, blueprint.height));
            return bo;
        };

        let createBallObject = (position: Point) => {
            let geometry = new THREE.SphereGeometry(0.4, 32, 32);
            let material = new THREE.MeshPhongMaterial({color: 'blue'});
            let mesh = new BallObject(geometry, material, 0.0005, 0.0006);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        let createPaddle = (position: Point) => {
            let geometry = new THREE.BoxGeometry(2, 0.135, 1);
            let material = new THREE.MeshPhongMaterial({color: 'blue'});
            let mesh = new PaddleObject(geometry, material);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        let createWall = (position: Point) => {
            let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshPhongMaterial({color: 'red', transparent: true, opacity: 0.1});
            let mesh = new WallObject(geometry, material);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        this.paddle = createPaddle(blueprint.paddlePosition);
        this.brickObjects = blueprint.bricks.map(brick => createBrickObject(brick));
        this.ballObjects = blueprint.ballPositions.map(position => createBallObject(position));

        for (let i = -1; i < blueprint.width + 1; i++) {
            let topWall = createWall(new Point(i, -1));

            this.topWalls.push(topWall);
        }

        for (let i = 0; i < blueprint.height + 1; i++) {
            let leftWall = createWall(new Point(-1, i));
            let rightWall = createWall(new Point(blueprint.width, i));

            this.sideWalls.push(leftWall);
            this.sideWalls.push(rightWall);
        }
    }

}

class BrickObject extends THREE.Mesh {
    constructor(geometry: THREE.Geometry, material: THREE.Material, public health: number) {
        super(geometry, material);
    }
}

class BallObject extends THREE.Mesh {

    velocity: THREE.Vector3;
    colliding: boolean;

    constructor(geometry: THREE.SphereGeometry, material: THREE.Material, public dx?: number, public dy?: number) {
        super(geometry, material);

        this.velocity = new THREE.Vector3(dx, dy);
        this.colliding = false;
    }

}

class WallObject extends THREE.Mesh {

}

class PaddleBoundaryObject extends THREE.Mesh {

}

class PaddleObject extends THREE.Mesh {

}

function convertScreenToCartesian(x: number, y: number, width: number, height: number): THREE.Vector3 {
    return new THREE.Vector3(width - x - (width / 2) - 0.5, height - y - (height / 2));
}