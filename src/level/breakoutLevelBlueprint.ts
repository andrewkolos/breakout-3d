import {isUndefined} from "typescript-collections/dist/lib/util";

export interface BreakoutLevelData {
    readonly name: string;
    readonly width: number;
    readonly height: number; /* Must be the maximum of blockGrid, powerupGrid. and playerGrid */
    readonly blockGrid: string[]; /* Grid of characters where each index has an integer representing the blocks hp. 0 or lack of character means no block */
    readonly powerupGrid: string[];
    readonly playerGrid: string[];
    readonly baseBallSpeed: number;
}

export class BreakoutLevelBlueprint {

    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly ballPositions: Point[];
    readonly paddlePosition: Point;
    readonly baseBallSpeed: number;
    readonly bricks: Brick[];


    private powerupMap: Map<Brick, POWERUP>;

    static createLevelBlueprintFromData(blueprint: BreakoutLevelData): BreakoutLevelBlueprint {
        function getCharFromGrid(grid: string[], x: number, y: number) {
            if (grid[y] === undefined)
                return undefined;
            return grid[y].charAt(x);
        }


        let bricks = <Brick[]> [];
        let powerupMap = new Map<Brick, POWERUP>();
        let ballPositions = <Point[]> [];
        let paddlePosition: Point;
        let paddleBoundaryPositions = <Point[]> [];

        for (let y = 0; y < blueprint.height; y++) {
            for (let x = 0; x < blueprint.width; x++) {

                let powerup = getCharFromGrid(blueprint.powerupGrid, x, y);
                console.log(getCharFromGrid(blueprint.powerupGrid, x, y));

                let brickHealth = Number(getCharFromGrid(blueprint.blockGrid, x, y));
                if (!isNaN(brickHealth)) {
                    let brick = new Brick(new Point(x, y), brickHealth);

                    bricks.push(brick);

                    if (isUndefined(powerup))
                        throw new RangeError(`Unexpected powerup value ${powerup}`);

                    powerupMap.set(brick, <POWERUP>powerup);
                }

                let playerItem = getCharFromGrid(blueprint.playerGrid, x, y);

                if (playerItem === 'p')
                    paddlePosition = new Point(x, y);
                if (playerItem === 'b')
                    ballPositions.push(new Point(x, y));
;
            }
        }

        return new BreakoutLevelBlueprint(blueprint.name, blueprint.width, blueprint.height, bricks, powerupMap, ballPositions, paddlePosition, paddleBoundaryPositions, blueprint.baseBallSpeed);
    }

    private constructor(name: string, width: number, height: number, brickGrid: Brick[], powerupMap: Map<Brick, POWERUP>,
                        ballPositions: Point[], paddlePosition: Point, paddleBoundaryPositions: Point[], baseBallSpeed: number) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.bricks = brickGrid;
        this.powerupMap = powerupMap;
        this.ballPositions = ballPositions;
        this.paddlePosition = paddlePosition;
        this.baseBallSpeed = baseBallSpeed;
    }

    public getBricksPowerup(brick: Brick) {
        return this.powerupMap.get(brick);
    }
}

export enum POWERUP {
    NONE = '-',
    EXPAND_PADDLE = 'e',
    BlASTERS = 'b',
    MULTIBALL = 'm',
    DOUBLEPOWER = 'd'
}

export class Point {
    constructor(public readonly x: number, public readonly y: number) {}
}


export class Brick {

    private _health: number;

    constructor(public location: Point, health: number) {
        this._health = health;
    }

    // An enum might be cleaner than a number, but number is simpler for our purposes
    set health(health: number) {
        if (health < 0 || health > 9) {
            throw new RangeError('Brick health property must be a number in the range [0, 9]');
        }

        this._health = health;
    }

    get health() {
        return this._health;
    }

}