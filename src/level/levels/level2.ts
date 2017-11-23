import {BreakoutLevelData} from "../breakoutLevelBlueprint";

let level: BreakoutLevelData = {
    "name": "Level 1",
    "width": 28,
    "height": 18,
    "blockGrid": [
        "----------------------------",
        "-0-0---0-0--------0-0---0-0-",
        "--1-----1----------1-----1--",
        "-0-0---0--00000000--0---0-0-",
        "----1-1--1---11---1--1-1----",
        "-----2---0---11---0--2-----",
        "----1-1--1---11---1--1-1----",
        "-0-0---0--00000000--0---0-0-",
        "--1-0-0-1----------1-----1--",
        "-0-0-1-0-0--------0-0---0-0-",
        "----0-0--------------0-0----"
    ],
    "powerupGrid": [
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "-----p----------------p-----",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------"
    ],
    "playerGrid": [
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "----------------------------",
        "============================",
        "-------------b--------------",
        "----------------------------",
        "-------------p--------------",
    ],
    "baseBallSpeed": 20
};

export default level;