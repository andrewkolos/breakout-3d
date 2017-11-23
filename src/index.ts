import {BreakoutGame} from "./game";
import blueprints from "./level/levels/index";
import {BreakoutLevelBlueprint} from "./level/breakoutLevelBlueprint";
import * as THREE from "three";
import {OrbitControls} from "three-orbitcontrols-ts";
import './physijs';

const GAME_TICKS_PER_SECOND = 60;

let renderer: THREE.WebGLRenderer;

let game = new BreakoutGame(GAME_TICKS_PER_SECOND, 1);

class Joj {
    constructor(public numbers: number[]) {
    }
}

declare let TWEEN: any;

document.body.onload = () => {

    setUpRenderer();
    setUpUI();

    game.loadLevel(BreakoutLevelBlueprint.createLevelBlueprintFromData(blueprints[0]));
    //game.start();

    console.log(game.scene);

    requestAnimationFrame(render);
};

function setUpRenderer() {
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0x000000, 1.0);
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


let loadedLevelIdx = 0;

function getLoadedLevelIdx() {
    return loadedLevelIdx;
}

function setUpUI() {

    $(window).keypress(function(event) {
        if (event.which === 82 || event.which === 114) {
            game.loadLevel(BreakoutLevelBlueprint.createLevelBlueprintFromData(blueprints[getLoadedLevelIdx()]));
        }
    });

    $('#clickToPlay').on('click', () => {
        let modal = $('#modal');

        let opacity = {value: 1};
        new TWEEN.Tween(opacity).to({value: 0}, 500)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(function () {
                modal.css('opacity', opacity.value);
            })
            .onComplete(function () {
                modal.css('display', 'none');
                game.start();
            }).start();
    });

    $('#resetButton').on('click', function() {
        game.loadLevel(BreakoutLevelBlueprint.createLevelBlueprintFromData(blueprints[getLoadedLevelIdx()]));
    });

    $('div[data-levelidx]').each(function (index, element) {
        $(this).on('click', function() {
            game.loadLevel(BreakoutLevelBlueprint.createLevelBlueprintFromData(blueprints[$(this).attr('data-levelidx')]));
            loadedLevelIdx = Number($(this).attr('data-levelidx'));
        })
    });
}

let render = () => {
    renderer.render(game.scene, game.camera);


    game.update();
    TWEEN.update();
    requestAnimationFrame(render);
};

