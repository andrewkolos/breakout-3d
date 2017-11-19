import {BreakoutGame} from "./game";
import blueprints from "./level/levels/index";
import {BreakoutLevelBlueprint} from "./level/breakoutLevelBlueprint";
import * as THREE from "three";
import {OrbitControls} from "three-orbitcontrols-ts";
import {AxisHelper} from "three";
import './physijs';

const GAME_TICKS_PER_SECOND = 60;

let renderer: THREE.WebGLRenderer;

let game = new BreakoutGame(GAME_TICKS_PER_SECOND, 1);

class Joj {
    constructor(public numbers: number[]) {}
}

declare let TWEEN: any;

document.body.onload = () => {

    setUpRenderer();

    game.loadLevel(BreakoutLevelBlueprint.createLevelBlueprintFromData(blueprints[0]));
    game.start();

    console.log(game.scene);
    game.scene.add(new AxisHelper(20));

    requestAnimationFrame(render);
};

function setUpRenderer() {
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0x00000, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    let controls = new OrbitControls(game.camera, renderer.domElement);
    controls.enableKeys = false;

    window.addEventListener('resize', () => {
        game.camera.aspect = window.innerWidth / window.innerHeight;
        game.camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    document.body.appendChild(renderer.domElement);
}

let render = () => {
    renderer.render(game.scene, game.camera);
    game.update();
    TWEEN.update();
    requestAnimationFrame(render);
};

