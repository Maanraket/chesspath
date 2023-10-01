
import Phaser from "phaser"
import PF from "pathfinding"
import * as seedrandom from "seedrandom"

import chazz from "../assets/princhess.png";
import bishopOdd from "../assets/bishop-odd.png";
import bishop from "../assets/bishop.png";
import knight from "../assets/knight.png";
import rook from "../assets/rook.png";
import ground from "../assets/ground.png";

import captureSound from "../sounds/capture.mp3";
import moveSound from "../sounds/move.mp3";

const captureAudio = new Audio(captureSound);
const moveAudio = new Audio(moveSound);

let findPath, matrix;
const tileSize = 48;
let score = 0;

let uiOverlay;

const queryParamSeed = new URLSearchParams(window.location.search).get('seed');
const date = new Date();

const seed = queryParamSeed ?? `${date.getDay()}-${date.getMonth()}-${date.getFullYear()}`;

console.log(seed)

window.onload = () => {
    /*
    * -----------------------------
    *      CHESS PATHFINDING
    * -----------------------------
    */
    var getChessNeighbors = function (node, diagonalMovement) {
        var nodes = this.nodes;
        var explore;
        var curx = node.x, cury = node.y;
        var possibleMoves = [];
        var piece = this.piece;
        var findMove = function (dx, dy, grid) {
            var x = curx + dx, y = cury + dy;
            while (grid.isWalkableAt(x, y)) {
                possibleMoves.push(nodes[y][x]);
                if (explore.single) { break }
                x += dx;
                y += dy;
            }
        }
        if (piece === 'rook') {
            explore = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        } else if (piece === 'bishop') {
            explore = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        } else if (piece === 'knight') {
            explore = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
            explore.single = true;
        } else if (piece === 'king' || piece === 'queen') {
            explore = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, -1], [-1, 1]];
            if (piece === 'king') explore.single = true;
        }
        for (var i = 0; i < explore.length; i++) {
            var dx, dy;
            dx = explore[i][0];
            dy = explore[i][1];
            findMove(dx, dy, this);
        }

        console.log(possibleMoves)

        return possibleMoves;
    };

    // //game level (walkability)
    // oldMatrix = [
    //     [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
    //     [1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    //     [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    //     [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    //     [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    //     [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
    //     [1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0],
    //     [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    //     [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    //     [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    //     [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    //     [0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    // ];

    /* rules for the matrix:

    TODO:
    There can be no nodes that are completely walled off from 9 sides
    prevent a L shape in the generation

    right now:
    The starting place (0,0) should be zero always
    ~25% of the squares will be generated as a wall

    */

    // idea for generation: every unit has max 3 squares siding with it. (all diagonals?)

    const rand = seedrandom(seed)

    const buildMatrix = () => {

        const matrixArray = [];
        for (let i = 0; i < 8; i++) {
            const row = [];
            for (let j = 0; j < 8; j++) {
                // generation math
                const square = Math.round(rand() * 4) < 3 ? 0 : 1;
                row.push(square);
            }
            matrixArray.push(row);
        }
        matrixArray[0][0] = 0;
        matrixArray[1][1] = 0
        const neighbors = [
            [-1, -1,],
            [-1, 0,],
            [-1, 1,],
            [0, -1],
            [0, 1,],
            [1, -1,],
            [1, 0,],
            [1, 1,],
        ]
        const maxNeighbors = 6

        matrixArray.forEach((row, rowIndex) => {
            row.forEach((value, valueIndex) => {
                let sum = 0;
                for (let neighbor of neighbors) {
                    const x = neighbor[0] + valueIndex
                    const y = neighbor[1] + rowIndex
                    if (x < 0 || x > row.length - 1 || y < 0 || y > matrixArray.length - 1) {
                        sum += 1
                        continue
                    }
                    sum += matrixArray[y][x]
                }
                console.log(sum)
                matrixArray[rowIndex][valueIndex] = matrixArray[rowIndex][valueIndex] === 1 && sum <= maxNeighbors ? 1 : 0
                // if (rowIndex > 0) { 
                //   sum += 3
                //   if (valueIndex > 0) {
                //     sum += matrixArray[rowIndex-1][valueIndex-1];
                //   }
                //   sum += matrixArray[rowIndex-1][valueIndex];
                //   if (valueIndex < row.length) {
                //     sum += matrixArray[rowIndex-1][valueIndex+1];
                //   }
                // }
            })
        })

        return matrixArray;
    }

    matrix = buildMatrix();

    var grid = new PF.Grid(matrix);

    var finder = new PF.AStarFinder({
        heuristic: function (x, y) {
            return 0.1 * (x + y);//Lower number means better paths, worse performace.
        }
    });


    findPath = function (x1, y1, x2, y2, piece) {
        var chessGrid = grid.clone();
        chessGrid.piece = piece;
        chessGrid.getNeighbors = getChessNeighbors;
        var path = finder.findPath(x1, y1, x2, y2, chessGrid);

        return path;
    }

    findPath(1, 7, 5, 6, "knight");


    /*
    * -----------------
    *      PHASER
    * -----------------
    */

    //global game variables
    var map, enemies, mainCharacter;
    var enemytypes = ['rook', 'knight', 'bishop'];

    //Other Global functions
    var drawMoves = function (moves, x, y) {
        uiOverlay.fillStyle(0x006600, 0.5);
        document.querySelectorAll(".moveTile").forEach((el) => el.remove())
        for (let i = 0; i < moves.length; i++) {
            const sx = moves[i].x;
            const sy = moves[i].y;
            uiOverlay.fillCircle(sx * tileSize + tileSize / 2, sy * tileSize + tileSize / 2, tileSize / 3.5); 
        }
    }

    const movesCalculator = (node, getGridFunction) => {
        const tempGrid = getGridFunction();
        tempGrid.piece = "queen";
        tempGrid.getNeighbors = getChessNeighbors;
        const moves = tempGrid.getNeighbors(node, null);
        return moves;
    }

    const positionCheck = (position, type) => {
        console.log(mainCharacter[type])
        for (var i = 0; i < mainCharacter[type].length && !position; i++) {
            position = (mainCharacter[type][i].x == Math.floor(mainCharacter.x / tileSize) && mainCharacter[type][i].y == Math.floor(mainCharacter.y / tileSize));
        }
        console.log(position)
        return position;
    }

    var getMainMoves = async function (forceLegal = false) {
        //First, check if our move was legal. Based on previously determined legal moves/current position
        let legalMove = forceLegal;
        let legalPosition = false;
        let unfilteredPosition = false;
        let enemyOverlap = false;

        if (!legalMove) {
            legalPosition = positionCheck(legalPosition, "currentMoves");
            unfilteredPosition = positionCheck(unfilteredPosition, "unfilteredMoves");
            enemies.children.each((enemy) => {
                enemyOverlap = enemyOverlap || (Math.floor(enemy.x / tileSize) == Math.floor(mainCharacter.x / tileSize) && Math.floor(enemy.y / tileSize) == Math.floor(mainCharacter.y / tileSize));
            })
            legalMove = legalPosition || (unfilteredPosition && enemyOverlap);
        }
        //If the move is legal, move the character, get new possible moves and draw those.
        if (legalMove) {
            //erase possible moves
            uiOverlay.clear();
            //move character
            mainCharacter.currentPosition = { x: mainCharacter.x, y: mainCharacter.y };
            var x = Math.floor(mainCharacter.x / tileSize);
            var y = Math.floor(mainCharacter.y / tileSize);
            //
            var node = { x: x, y: y };
            console.log(x,y)
            var currentGrid = getUpdatedGrid();
            currentGrid.piece = "queen";
            currentGrid.getNeighbors = getChessNeighbors;
            //check if any enemy was killed
            var enemyKilled = !currentGrid.isWalkableAt(x, y);
            if (enemyKilled) {
                console.log("you killed an enemy!");
                score++;
                document.querySelector("h1").innerHTML = score
                enemies.children.each((enemy) => {
                    var ex = Math.floor(enemy.x / tileSize);
                    var ey = Math.floor(enemy.y / tileSize);
                    if (x == ex && y == ey) {
                        enemy.destroy();

                        enemies.remove(enemy);
                    }
                })
            }
            console.log("move enemies", currentGrid)
            await moveEnemies();
            if (enemyKilled) {
                captureAudio.play();
                addRandomEnemy();
                addRandomEnemy();
            } else {
                moveAudio.play();
            }
            //check if dead
            const newGrid = getUpdatedGrid()
            console.log(x,y, newGrid, newGrid.isWalkableAt(x,y))

            if (!getUpdatedGrid().isWalkableAt(x, y)) {
                console.log("you're dead!");
                mainCharacter.destroy();

                document.body.insertAdjacentHTML("beforeend", '<h1><a href="index.html">Game over :( - Play again!</a></h1>')

                if (Math.random() > 0.05) return

                // console.log("hee ouwe lekkere lellebel" + " wat zie je er weer snoezig uit vandaag");
                // console.warn("als je nou niet oplet he")

                // console.error("dan sla ik je voor je muil")
                // alert("het is tijd voor een pofje!")
                // const answer = prompt("do you want a pofje? tip: jazeker")
                // if (answer === "jazeker") {
                //     window.location.href = "http://www.maanraket.nl/experiments/fractals"
                // }
                "zonne lekker pofske toch"
                "woef, woef! woef! woef!"
            }

            mainCharacter.currentMoves = movesCalculator(node, getUpdatedGrid);
            mainCharacter.unfilteredMoves = movesCalculator(node, () => grid.clone());
            console.log("enemies children", enemies.children, enemies );
            // enemies.children.each((child) => console.log(child.update()))

            // emitr.children.sort(function(a,  {  if (a.scale.x < b.scale.x) {    return -1;  }  else {    return 1;  }});
            // const Set2 = Object.getPrototypeOf(enemies.children).constructor
            // enemies.children = new Set2(enemies.children.getArray().sort((a,b) => b.y - a.y))
            enemies.children.each((c) => c.setDepth(c.y))
            mainCharacter.setDepth(mainCharacter.y);
            
            drawMoves(mainCharacter.currentMoves, x, y);
            return true;
        } // If the move was illegal, return the character back to its original position. 
        else {
            mainCharacter.x = mainCharacter.currentPosition.x;
            mainCharacter.y = mainCharacter.currentPosition.y;
            return false;
        }
    }

    var getUpdatedGrid = function () {
        var newGrid = grid.clone();
        enemies.children.each((enemy) => {
            var x = Math.floor(enemy.x / tileSize);
            var y = Math.floor(enemy.y / tileSize);
            console.log(enemy.x, x, enemy.y, y)
            newGrid.setWalkableAt(x, y, false);
        })
        return newGrid;
    }

    var nextFrame = () => new Promise(requestAnimationFrame)

    async function animate(sourceX, sourceY, targetX, targetY, numFrames, callback, t) {
        if (t >= 1) {
            callback(targetX, targetY)
            return
        }
        const tsqrt = Math.sqrt(t)
        const diffX = targetX - sourceX
        const diffY = targetY - sourceY
        const newX = sourceX + tsqrt * diffX
        const newY = sourceY + tsqrt * diffY
        callback(newX, newY)
        await nextFrame()
        return animate(sourceX, sourceY, targetX, targetY, numFrames, callback, t + 1 / numFrames)
    }

    var moveEnemies = async function () {
        console.log(enemies)

        const theEnemies = []
        enemies.children.each((child) => theEnemies.push(child))
        
        for (let enemy of theEnemies) {
            var x = Math.floor(enemy.x / tileSize);
            var y = Math.floor(enemy.y / tileSize);
            var currentGrid = getUpdatedGrid();
            currentGrid.piece = enemy.piece;
            currentGrid.getNeighbors = getChessNeighbors;
            var path = finder.findPath(x, y, Math.floor(mainCharacter.x / tileSize), Math.floor(mainCharacter.y / tileSize), currentGrid);
            
            if (path.length > 0) {
                const sourceX = enemy.x
                const targetX = path[1][0] * tileSize

                const sourceY = enemy.y
                const targetY = path[1][1] * tileSize

                function step(x, y) {
                    enemy.x = x
                    enemy.y = y
                }

                await animate(sourceX, sourceY, targetX, targetY, 10, step, 0)
            }
        }
    }

    var addEnemy = function (x, y, type) {
        console.log("enemies", enemies.children)
        const isOdd = (x % 2) * (y % 2) + ((x + 1) % 2) * ((y + 1) % 2);
        const enemy = enemies.create(x * tileSize, y * tileSize, 'enemy-' + type + ((isOdd && type == "bishop") ? "-odd" : ""));
        console.log(enemy)
        enemy.piece = type;
        enemy.setOrigin(-0.15,0.35)
    }

    var addRandomEnemy = function () {
        var x = Math.floor(Math.random() * matrix.length);
        var y = Math.floor(Math.random() * matrix.length);
        var currentGrid = getUpdatedGrid();
        currentGrid.setWalkableAt(Math.floor(mainCharacter.x / tileSize), Math.floor(mainCharacter.y / tileSize), false);
        if (currentGrid.isWalkableAt(x, y)) {
            addEnemy(x, y, enemytypes[Math.floor(Math.random() * enemytypes.length)]);
        } else {
            addRandomEnemy();
        }
    }

    class Chazz extends Phaser.Scene {
        
        preload () {
          console.log("preload")
          this.load.image('ground', ground);
          this.load.image('enemy-rook', rook);
          this.load.image('enemy-knight', knight);
          this.load.image('enemy-bishop', bishop);
          this.load.image('enemy-bishop-odd', bishopOdd);
          this.load.spritesheet('main-character', chazz, {
            frameWidth: 24,
            frameHeight: 35
          });
        }
        create () {
            map = this.make.tilemap({ tileWidth: tileSize, tileHeight: tileSize, width: 8, height: 8 });
            map.setRenderOrder(2)
            const tileset = map.addTilesetImage('ground', null, tileSize, tileSize);
            const levelLayer = map.createBlankLayer('level1', tileset);

            for (var y = 0; y < matrix.length; y++) {
                for (var x = 0; x < matrix[y].length; x++) {
                    map.putTileAt(matrix[y][x] * 2 + (x % 2) * (y % 2) + ((x + 1) % 2) * ((y + 1) % 2), x, y, levelLayer);
                }
            }
    
            //UI Overlay
            uiOverlay = this.add.graphics();
    
            //Enemies
            enemies = this.add.group();
            addEnemy(3, 3, 'knight');
    
            //main character
            mainCharacter = this.add.sprite(tileSize/2, tileSize/2, 'main-character');
            mainCharacter.currentPosition = { x: 0, y: 0 };
            mainCharacter.currentMoves = [];
            mainCharacter.unfilteredMoves = [];
            mainCharacter.width = 24;
            mainCharacter.height = 35;
            mainCharacter.setOrigin(0.5, 0.5);
            mainCharacter.setDepth(420);

            // Animate main character
            this.anims.create({
                key: "idle",
                frameRate: 5,
                frames: this.anims.generateFrameNumbers("main-character", { start: 0, end: 3 }),
                repeat: -1
            });
            mainCharacter.play('idle');

            // Make main character interactive and draggable
            mainCharacter.inputEnabled = true;
            mainCharacter.setInteractive({ draggable: true, useHandCursor: true });
            let isDragging = false;

            this.input.on('dragstart', function (pointer, gameObject) {
                mainCharacter.setDepth(420);
                isDragging = true;
            });

            this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
              gameObject.x = dragX;
              gameObject.y = dragY;
            });
    
            this.input.on('dragend', function (pointer, gameObject) {
                isDragging = false;
                if (gameObject === mainCharacter) {
                    gameObject.setPosition(
                        Phaser.Math.Snap.To(gameObject.x, tileSize, tileSize / 2),
                        Phaser.Math.Snap.To(gameObject.y, tileSize, tileSize / 2)
                    );
                    mainCharacter.setDepth(mainCharacter.y);
                    getMainMoves()
                }
            });

            this.input.on('pointerdown', async function (pointer, gameObject) {
                if (isDragging) return;
                const x = Phaser.Math.Snap.To(pointer.downX, tileSize, tileSize / 2);
                const y = Phaser.Math.Snap.To(pointer.downY, tileSize, tileSize / 2);

                const xTarget = Math.floor(x / tileSize)
                const yTarget = Math.floor(y / tileSize)

                const legal = grid.isWalkableAt(xTarget, yTarget) 
                    && mainCharacter.unfilteredMoves.some(({ x, y }) => x === xTarget && y === yTarget)

                if (legal) await animate(mainCharacter.x, mainCharacter.y, x, y, 10, (x, y) => {
                    mainCharacter.x = x
                    mainCharacter.y = y
                }, 0)

                mainCharacter.setPosition(x,y);
                mainCharacter.setDepth(mainCharacter.y);
                getMainMoves();
            });

            getMainMoves(true);
        }
        update(){}
        render(){}
    }

    const config = {
      type: Phaser.AUTO,
      width: tileSize * matrix.length,
      height: tileSize * matrix.length,
      // renderer: Phaser.CANVAS,
      scene: Chazz,
      //   scene: {
      //     preload: preload,
      //     create: create,
      //     update: update
      //   },
      transparent: false,
      antialias: false,
      parent: "chess",
      pixelArt: true,
    }
    
    console.log(Phaser.Game);

    // new Game(width, height, renderer, parent, state, transparent, antialias, physicsConfig)
    const game = new Phaser.Game(config);
}