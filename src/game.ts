import {createTickWrapper} from "./util/tickWrapper";
import {BreakoutLevelBlueprint, Brick, Point} from "./level/breakoutLevelBlueprint";
import * as THREE from 'three';
import {GamepadManager} from "./gamepad/gamepadManager";
import {GAMEPAD_AXES} from "./gamepad/mappedGamepad";
import Keyboard from './util/keyboard';
import {Sound, SoundCollection} from "./sounds";

declare let TWEEN: any;
declare let PxGamepad: any;

let gamepad = new PxGamepad();
gamepad.start();

export class BreakoutGame {

    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;

    private level: BreakoutLevel;
    private levelBlueprint: BreakoutLevelBlueprint;

    private sideWallBoxes = <THREE.Box3[]> [];

    private _speedModifier: number;

    private ballSpeed: number;
    private ballHitSounds = new SoundCollection([new Sound('sounds/1.mp3', 1, 5),
                                                new Sound('sounds/1_pitchdown_5.mp3', 1, 5),
                                                new Sound('sounds/1_pitchdown_10.mp3', 1, 5),
                                                new Sound('sounds/1_pitchup_5.mp3', 1, 5),
                                                new Sound('sounds/1_pitchup_10.mp3',1,5)]);

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
        this.camera.position.set(0, -10, 20);
        this._updatesPerSecond = updatesPerSecond;
        this._speedModifier = speedModifier / updatesPerSecond;


        this.scene.add(new THREE.AmbientLight('white', 0.2));
        let dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(-7, -5, 8);
        this.scene.add(dirLight1);

        let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.4);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(0, 0, 10);
        this.scene.add(hemiLight);

    }

    update = () => {
        if (!this._running)
            return;

        let handleBrickRemoval = () => {
            if (this.level.brickObjects.length === 0) {
                console.log('winner');
            }
        };

        let handleBallOutOfBounds = (bo: BallObject) => {
            let paddle = this.level.paddle;
            (paddle.material as THREE.MeshPhongMaterial).transparent = true;
            (bo.material as THREE.MeshPhongMaterial).transparent = true;
            if (this.level.ballObjects.length === 0) {
                console.log('loser');
                let opacity = {value: 1};
                new TWEEN.Tween(opacity).to({value: 0}, 700)
                    .easing(TWEEN.Easing.Cubic.Out)
                    .onUpdate(function () {
                        (<THREE.MeshPhongMaterial> paddle.material).opacity = opacity.value;
                        (<THREE.MeshPhongMaterial> bo.material).opacity = opacity.value;
                    }).onComplete(() => {
                        this.scene.remove(paddle);
                        setTimeout(()=> {
                            this.loadLevel(this.levelBlueprint);
                        }, 500);
                }).start();
            }
        };

        let handleCollisions = () => {
            this.level.ballObjects.forEach(bo => {
                let ballBox = new THREE.Box3().setFromObject(bo);
                let map = new Map<THREE.Object3D, THREE.Vector3>();

                this.level.topWalls.forEach((twb) => {
                    map.set(twb, new THREE.Vector3(1, -1, 1));
                });
                this.level.sideWalls.forEach((swb) => {
                    map.set(swb, new THREE.Vector3(-1, 1, 1));
                });

                let paddleBox = new THREE.Box3().setFromObject(this.level.paddle);
                let paddle_width = paddleBox.getSize().x;
                let paddle_height = paddleBox.getSize().y;
                let paddlePos = this.level.paddle.position;

                let origin = new THREE.Vector2(0, 0);
                let ballRelPos = new THREE.Vector2(bo.position.x - paddlePos.x, bo.position.y - paddlePos.y);
                let newBallRelPos = ballRelPos.rotateAround(origin, -this.level.paddle.rotation.z);

                if (Math.abs(newBallRelPos.x) - 0.4 < paddle_width / 2 && Math.abs(newBallRelPos.y) - 0.40 < paddle_height / 2) {

                    let d = new THREE.Vector2(bo.velocity.x, bo.velocity.y);

                    d.rotateAround(origin, -this.level.paddle.rotation.z);
                    if (!bo.stillCollidingWithPlayer || d.y < 0) {
                        d.y = -d.y;
                        d.rotateAround(origin, this.level.paddle.rotation.z);
                        bo.velocity.x = d.x;
                        bo.velocity.y = d.y;


                        bo.stillCollidingWithPlayer = true;
                        this.ballHitSounds.playOne();
                    }


                } else {
                    bo.stillCollidingWithPlayer = false;
                }


                this.level.brickObjects.forEach(brick => {
                    let brickBox = new THREE.Box3().setFromObject(brick);
                    if (brick.vulnerable && brickBox.intersectsBox(ballBox)) {
                        let xdisp = Math.abs(brick.position.x - bo.position.x);
                        let ydisp = Math.abs(brick.position.y - bo.position.y);

                        if (xdisp > ydisp) {
                            map.set(brick, new THREE.Vector3(-1, 1, 1));
                        } else {
                            map.set(brick, new THREE.Vector3(1, -1, 1));
                        }

                        brick.setHealth(brick.health - 1);
                        if (brick.health < 0) {
                            this.scene.remove(brick);
                            this.level.brickObjects = this.level.brickObjects.filter(o => o !== brick);
                            handleBrickRemoval();
                        }
                        brick.vulnerable = false;
                        setTimeout(() => brick.vulnerable = true, 100);
                    }
                });

                if (bo.move(map)) {
                    this.ballHitSounds.playOne();
                }

                if (bo.position.x < -this.level.width / 2 - 2 || bo.position.x > this.level.width / 2 + 2 ||
                    bo.position.y < -this.level.height / 2 - 2 || bo.position.y > this.level.height / 2 + 2) {
                    this.level.ballObjects.splice(this.level.ballObjects.indexOf(bo), 1);
                    handleBallOutOfBounds(bo);
                }

            }); // end ball, TODO make block shorter
        };

        handleCollisions();

        let movePaddle = (dPosition: THREE.Vector3, newRotation?: THREE.Vector3) => {
            let opos = this.level.paddle.position.clone();
            let orot = this.level.paddle.rotation.clone();

            /*let euler = new THREE.Euler().copy(this.level.paddle.rotation).toVector3();
            euler.add(newRotation);*/
            if (newRotation)
            this.level.paddle.rotation.copy(new THREE.Euler().setFromVector3(newRotation));

            this.level.paddle.position.add(dPosition);
            //this.level.paddle.rotation.setFromVector3(euler);
            let validMove = true;

            let paddlebox = new THREE.Box3().setFromObject(this.level.paddle);
            this.sideWallBoxes.forEach(swb => {
                if (swb.intersectsBox(paddlebox))
                    validMove = false;
            });
            if (this.level.paddle.position.y < -this.level.height / 2) {
                validMove = false;
            }

            this.level.paddleBoundaries.forEach(pb => {
                let box = new THREE.Box3().setFromObject(pb);
                if (box.containsPoint(this.level.paddle.position))
                    validMove = false;
            });

            if (!validMove) {
                this.level.paddle.position.copy(opos);
                this.level.paddle.rotation.copy(orot);
            }
        };

        if (Keyboard.isDown(Keyboard.LEFTARROW) || Keyboard.isDown(Keyboard.A)) {
            movePaddle(new THREE.Vector3(-0.15, 0));
        }

        if (Keyboard.isDown(Keyboard.RIGHTARROW) || Keyboard.isDown(Keyboard.D)) {
            movePaddle(new THREE.Vector3(0.15, 0));
        }

        if (Keyboard.isDown(Keyboard.UPARROW) || Keyboard.isDown(Keyboard.W)) {
            movePaddle(new THREE.Vector3(0, 0.15));
        }

        if (Keyboard.isDown(Keyboard.DOWNARROW) || Keyboard.isDown(Keyboard.S)) {
            movePaddle(new THREE.Vector3(0, -0.15));
        }

        if (Keyboard.isDown(Keyboard.Q)) {
            movePaddle(new THREE.Vector3(), new THREE.Vector3(0, 0, this.level.paddle.rotation.z + Math.PI / 64));
        }

        if (Keyboard.isDown(Keyboard.E)) {
            movePaddle(new THREE.Vector3(), new THREE.Vector3(0, 0, this.level.paddle.rotation.z - Math.PI / 64));
        }

        let playerPaddleSpeed = new THREE.Vector2(0, 0);
        let gp = gamepad.getGamepad();
        if (gp) {
            {
                let x = gp.axes[0];
                let y = gp.axes[1];
                movePaddle(new THREE.Vector3(0.15 * x, -0.15 * y, 0));
            }
            {
                let x = gp.axes[2];
                let y = gp.axes[3];
                let angle = Math.atan2(-y, x);
                if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1)
                movePaddle(new THREE.Vector3(), new THREE.Vector3(0,0,angle - Math.PI/2));
            }
        }


        /*if (manager.isGamepadConnected(0)) {
            let gp = manager.getGamepadState(0);
            if (gp.axis(GAMEPAD_AXES.LEFT_STICK_Y) < -0.5)
                this.level.paddle.position.x -= 0.1;
        }*/

    };

    loadLevel = (blueprint: BreakoutLevelBlueprint) => {
        this.unloadLevel();
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
        this.levelBlueprint = blueprint;
    };

    unloadLevel = () => {
        if(this.level) {
            let objects = [...this.level.sideWalls, ...this.level.topWalls, ...this.level.ballObjects, ...this.level.brickObjects, ...this.level.paddleBoundaries, this.level.paddle];

            objects.forEach((o) => {
                o.geometry.dispose();
                // note: currently not recursive
                (o.material as THREE.MeshPhongMaterial).dispose();
                if (this.scene.children.indexOf(o) !== -1)
                    this.scene.remove(o);
            });

            this.level = null;
            this.sideWallBoxes = [];
        }
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
    height: number;
    width: number;
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
            let geometry = new THREE.BoxGeometry(3, 0.135, 1);
            let material = new THREE.MeshPhongMaterial({color: 'blue'});
            let mesh = new PaddleObject(geometry, material);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        let createWall = (position: Point) => {
            let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshPhongMaterial({color: 'white'});
            let mesh = new WallObject(geometry, material);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        let createPaddleBoundary = (position: Point) => {
            let geometry = new THREE.BoxGeometry(1, 1, 1);
            let material = new THREE.MeshPhongMaterial({color: 'green', transparent: true, opacity: 0});
            let mesh = new PaddleBoundaryObject(geometry, material);
            mesh.position.copy(convertScreenToCartesian(position.x, position.y, blueprint.width, blueprint.height));
            return mesh;
        };

        this.paddle = createPaddle(blueprint.paddlePosition);
        this.brickObjects = blueprint.bricks.map(brick => createBrickObject(brick));
        this.ballObjects = blueprint.ballPositions.map(position => createBallObject(position));
        this.paddleBoundaries = blueprint.boundaryPositions.map(position => createPaddleBoundary(position));
        this.baseBallSpeed = blueprint.baseBallSpeed;
        this.width = blueprint.width;
        this.height = blueprint.height;

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

    private constructor(geometry: THREE.Geometry, material: THREE.Material, public health: number, public vulnerable: boolean = true) {
        super(geometry, material);
    }

    setHealth(newHealth: number) {
        this.health = newHealth;
        (<THREE.MeshPhongMaterial> this.material).color = new THREE.Color(BrickObject.HEALTH_COLOR_SCHEME[newHealth]);
    }

    static createBrick(health: number) {
        let geometry = new THREE.BoxGeometry(1, 1, 1);
        let material = new THREE.MeshPhongMaterial({color: BrickObject.HEALTH_COLOR_SCHEME[health]});
        return new BrickObject(geometry, material, health);
    }
}

class BallObject extends THREE.Mesh {

    velocity: THREE.Vector3;

    stillCollidingWithPlayer = false;
    private prevCollisions = <THREE.Object3D[]> [];

    constructor(geometry: THREE.SphereGeometry, material: THREE.Material, public dx?: number, public dy?: number) {
        super(geometry, material);

        this.velocity = new THREE.Vector3(dx, dy);
    }

    move(objectsVelocityMultipliers: Map<THREE.Object3D, THREE.Vector3>) {
        let collided = false;

        let velClone = this.velocity.clone();
        let previousVelocity = this.velocity.clone();

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
                        collided = true;
                        this.velocity.copy(candidateVelocity);
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

        /*while (isColliding()) {
            this.position.copy(this.position.add(this.velocity));
        }*/

        this.prevCollisions = currentCollisions;
        return collided;

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