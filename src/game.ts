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

    private ballSpeed: number;

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
        this._speedModifier = speedModifier / updatesPerSecond;
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

                            bo.colliding = true;
                        }
                        collided = true;
                    }
                }

                let paddleBox = new THREE.Box3().setFromObject(this.level.paddle);
                if (paddleBox.intersectsBox(ballBox)) {
                    if (!bo.colliding) {
                        bo.velocity.y *= -1;
                        bo.velocity.x = this.ballSpeed * Math.atan2(bo.position.y - this.level.paddle.position.y, bo.position.x - this.level.paddle.position.x);
                        bo.position.copy(prevPosition);
                        bo.position.add(bo.velocity);

                        bo.colliding = true;
                    }
                    collided = true;
                }

                this.level.brickObjects.forEach(brick => {
                    let brickBox = new THREE.Box3().setFromObject(brick);
                   if (brickBox.intersectsBox(ballBox)) {
                       if (!bo.colliding) {
                           let xdisp = Math.abs(brick.position.x - bo.position.x);
                           let ydisp = Math.abs(brick.position.y - bo.position.y);

                           if (xdisp > ydisp) {
                               bo.velocity.x *= -1;
                               bo.position.copy(prevPosition);
                               bo.position.add(bo.velocity);
                           } else {
                               bo.velocity.y *= -1;
                               bo.position.copy(prevPosition);
                               bo.position.add(bo.velocity);
                           }

                           brick.health --;
                           if (brick.health < 0) {
                               this.scene.remove(brick);
                               this.level.brickObjects = this.level.brickObjects.filter(o => o!==brick);
                           }

                           bo.colliding = true;
                       }
                       collided = true;
                   }
                });

                if (!collided) {
                    bo.colliding = false;
                }


            });
        };

        handleCollisions();

        let movePaddle = (dx: number) => {
            this.level.paddle.position.x += dx;

            let paddlebox = new THREE.Box3().setFromObject(this.level.paddle);
            this.sideWallBoxes.forEach(swb => {
                if (swb.intersectsBox(paddlebox))
                    this.level.paddle.position.x -= dx;
            });
        };

        if (Keyboard.isDown(Keyboard.LEFTARROW) || Keyboard.isDown(Keyboard.A)) {
            movePaddle(-0.1);
        }

        if (Keyboard.isDown(Keyboard.RIGHTARROW) || Keyboard.isDown(Keyboard.D)) {
            movePaddle(0.1);
        }

        if (manager.isGamepadConnected(0)) {
            let gp = manager.getGamepadState(0);
            if (gp.axis(GAMEPAD_AXES.LEFT_STICK_Y) < -0.5)
                this.level.paddle.position.x -= 0.1;
        }
    };

    loadLevel = (blueprint: BreakoutLevelBlueprint) => {
        this.level = new BreakoutLevel(blueprint);
        this.ballSpeed = this._speedModifier * this.level.baseBallSpeed;
        this.level.ballObjects.forEach(ballo => {
            this.scene.add(ballo);
            ballo.velocity = new THREE.Vector3(this.ballSpeed* 0.5, this.ballSpeed * 0.5, 0);
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
    baseBallSpeed: number;

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
            let mesh = new BallObject(geometry, material, this.baseBallSpeed * 0.5, this.baseBallSpeed * 0.5);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        let createPaddle = (position: Point) => {
            let geometry = new THREE.BoxGeometry(5, 0.135, 1);
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
        this.baseBallSpeed = blueprint.baseBallSpeed;

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
    private collided: boolean = false;

    constructor(geometry: THREE.SphereGeometry, material: THREE.Material, public dx?: number, public dy?: number) {
        super(geometry, material);

        this.velocity = new THREE.Vector3(dx, dy);
        this.colliding = false;
    }

    handleCollision(box: THREE.Box3, newVelocity?: THREE.Vector3) {
        let position = this.position.clone();
        this.position = this.position.add(this.velocity);

        let ballBox = new THREE.Box3().setFromObject(this);
        if (box.intersectsBox(ballBox)) {
            if (!this.colliding) {
                this.position.copy(position);
                this.velocity.copy(newVelocity);
                this.colliding = true;
            }
            this.collided = true;
        }
    }

    tick() {
        if (!this.collided) {
            this.colliding = false;
        }
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