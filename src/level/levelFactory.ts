import {BreakoutLevelBlueprint, BreakoutLevelData} from "./breakoutLevelBlueprint";
import levels from "./levels/index";

export class breakoutLevelFactory {
    constructor() {}

    static createLevelByName(name: string) {
        for (let level of levels) {
            if (level.name === name)
                return BreakoutLevelBlueprint.createLevelBlueprintFromData(level);
        }

        throw new RangeError(`Level with name ${name} was not found.`);
    }
}