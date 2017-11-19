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


            // may need to velocity change from being undone
            this.level.ballObjects.forEach(bo => {
                if (!bo.busy) {
                    let ballBox = new THREE.Box3().setFromObject(bo);
                    let map = new Map<THREE.Object3D, THREE.Vector3>();

                    this.level.topWalls.forEach((twb) => {
                        map.set(twb, new THREE.Vector3(1, -1, 1));
                    });
                    this.level.sideWalls.forEach((swb) => {
                        map.set(swb, new THREE.Vector3(-1, 1, 1));
                    });


                    let paddleBox = new THREE.Box3().setFromObject(this.level.paddle);
                    if (paddleBox.intersectsBox(ballBox)) {
                        bo.position.copy(bo.position);
                        bo.position.y += 0.1;
                        bo.velocity.y *= -1;
                        bo.velocity.x = this.ballSpeed * Math.atan2(bo.position.y - this.level.paddle.position.y, bo.position.x - this.level.paddle.position.x);
                    }

                    this.level.brickObjects.forEach(brick => {
                        let brickBox = new THREE.Box3().setFromObject(brick);
                        if (brickBox.intersectsBox(ballBox)) {
                            let xdisp = Math.abs(brick.position.x - bo.position.x);
                            let ydisp = Math.abs(brick.position.y - bo.position.y);

                            if (xdisp > ydisp) {
                                map.set(brick, new THREE.Vector3(-1, 1, 1));
                            } else {
                                map.set(brick, new THREE.Vector3(1, -1, 1));
                            }

                            // may need to truly insure collision
                            brick.setHealth(brick.health - 1);
                            if (brick.health < 0) {
                                this.scene.remove(brick);
                                this.level.brickObjects = this.level.brickObjects.filter(o => o !== brick);
                            }
                        }
                    });

                    bo.move(map);
                }
            }); // end ball, TODO make block shorter
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
            ballo.velocity = new THREE.Vector3(this.ballSpeed * 0.5, this.ballSpeed * 0.5, 0);
        });
        this.level.brickObjects.forEach(bricko => this.scene.add(bricko));
        this.level.paddleBoundaries.forEach(pb => this.scene.add(pb));
        this.level.topWalls.forEach(wall => this.scene.add(wall));
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

    brickObjects = <BrickObject[]> [];
    paddle: PaddleObject;
    ballObjects = <BallObject[]> [];
    paddleBoundaries = <PaddleBoundaryObject[]> [];
    topWalls = <WallObject[]> [];
    sideWalls = <WallObject[]> [];
    baseBallSpeed: number;

    constructor(blueprint: BreakoutLevelBlueprint) {

        let createBrickObject = (brick: Brick) => {
            let bo = BrickObject.createBrick(brick.health);
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
    static readonly HEALTH_COLOR_SCHEME = [0x00f5ec, 0x00f582, 0x00f50c, 0x8af500, 0xe9f500, 0x99ff00, 0xffff00, 0xff9d00, 0xff5400, 0xff0000];

    private constructor(geometry: THREE.Geometry, material: THREE.Material, public health: number) {
        super(geometry, material);
    }

    setHealth(newHealth: number) {
        this.health = newHealth;
        (<THREE.MeshPhongMaterial> this.material).color = new THREE.Color(BrickObject.HEALTH_COLOR_SCHEME[newHealth]);
    }

    static createBrick(health: number) {
        let geometry = new THREE.BoxGeometry(1,1,1);
        let material = new THREE.MeshPhongMaterial({color: BrickObject.HEALTH_COLOR_SCHEME[health]});
        return new BrickObject(geometry, material, health);
    }
}

class BallObject extends THREE.Mesh {

    velocity: THREE.Vector3;

    private prevCollisions = <THREE.Object3D[]> [];
    busy: boolean = false;

    constructor(geometry: THREE.SphereGeometry, material: THREE.Material, public dx?: number, public dy?: number) {
        super(geometry, material);

        this.velocity = new THREE.Vector3(dx, dy);
    }

    move(objectsVelocityMultipliers: Map<THREE.Object3D, THREE.Vector3>) {
        let velClone = this.velocity.clone();
        let previousVelocity = this.velocity.clone();
        console.log('moving', this.velocity);
        this.position.copy(this.position.add(this.velocity));
        let myBox = (new THREE.Box3()).setFromObject(this);

        let entries: [THREE.Object3D, THREE.Vector3][] = Array.from(objectsVelocityMultipliers.entries());
        let currentCollisions = <THREE.Object3D[]> [];
        for (let entry of entries) {
            let obj = entry[0];
            let box = new THREE.Box3().setFromObject(obj);
            let velocityMultiplier = entry[1];

            if (myBox.intersectsBox(box)) {
                currentCollisions.push(obj);
                if (this.prevCollisions.indexOf(obj) === -1) {
                    let candidateVelocity = (velClone.multiply(velocityMultiplier)).clone();

                    let good = true;
                    if (velocityMultiplier.x !== 1)
                        if (candidateVelocity.x === previousVelocity.x) {
                            good = false;
                        }
                    if (velocityMultiplier.y !== 1)
                        if (candidateVelocity.y === previousVelocity.y)
                            good = false;
                    if (velocityMultiplier.z !== 1)
                        if (candidateVelocity.z === previousVelocity.z)
                            good = false;

                    if (good) {
                        this.velocity.copy(candidateVelocity);
                        console.log(this.velocity);
                        /*setTimeout(() => {
                            this.busy = true;
                        }, 100);*/
                    }
                }
            }
        }

        let isColliding = () => {
            let myBox = new THREE.Box3().setFromObject(this);
            for (let obj of currentCollisions) {
                let box = new THREE.Box3().setFromObject(obj);
                if (myBox.intersectsBox(box))
                    return true;
            }
            return false;
        };

        while (isColliding()) {
            this.position.copy(this.position.add(this.velocity));
        }

        this.prevCollisions = currentCollisions;

    }
}

/*class CollisionWrapper {
    constructor(public boxes: THREE.Box3[], public
}*/


class WallObject extends THREE.Mesh {

}

class PaddleBoundaryObject extends THREE.Mesh {

}

class PaddleObject extends THREE.Mesh {

}

function convertScreenToCartesian(x: number, y: number, width: number, height: number): THREE.Vector3 {
    return new THREE.Vector3(width - x - (width / 2) - 0.5, height - y - (height / 2));
}