class GameModel {
    constructor() {
        const MIN_WIDTH = 128;
        const MIN_HEIGHT = 64;
        this.DEBUG = false;
        // states: 0 - init, 1 - active, 2 - pause, 3 - missed, 6 - game over, 7 - level complete
        this.title = 'Bounce game';
        this.statusTitle = '';
        this.state = 0; // INITIALIZATION
        this.time = 0;
        this.err = 0; // OK
        this.errMsg = ''; // OK
        this.score = 0;
        this.ballOnPaddle = true;
        this.scoreInterval = 1000; // 1 score for speed 0.1 each 1s
        this.SCORE_BRICK_DESTROY = 100;
        this.speedInterval = 20 * 1000; // speed up each 20s

        // if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        //     this.err = 1; // ERROR
        //     this.errMsg = 'Width or Height is not enough for game';
        // }
        //this.height = height - this.footerHeight;

        // Game Area parameters
        this.BRICK_WIDTH = 40;
        this.BRICK_HEIGHT = 20;
        this.width = this.BRICK_WIDTH * 16 + 1; // fixed
        this.height = 652; // fixed 700
        this.footerHeight = 48;
        // ball
        this.ballRadius = 8;
        this.ballDiam = this.ballRadius * 2;
        // paddle
        this.paddleHeight = 16;
        this.paddleHalf = 32;
        this.paddleWidth = this.paddleHalf * 2;
        this.paddleTop = this.height;
        this.paddleX = this.width / 2;
        this.paddleLeft = this.paddleX - this.paddleHalf;
        this.paddleRight = this.paddleX + this.paddleHalf;
        this.paddleAngle1 = 0.2;
        this.paddleAngle2 = 0.4;
        this.paddleAngle3 = 0.6;
        // bricks
        this.bricks = []; // format: [x1, x2, y1, y2, id, type, color]
        this.bricks.push( // game area
            [0, this.width, 0, this.height + this.footerHeight, 0, 1, 0xdcdcdc]);
        // levels
        this.levels = [];
        this.level = -1;
    }
    newGame() {
        this.time = 0;
        this.ballOnPaddle = true;
        // paddle
        this.paddleX = this.width / 2;
        this.paddleLeft = this.paddleX - this.paddleHalf;
        this.paddleRight = this.paddleX + this.paddleHalf;
        // ball
        this.speed = 0.1;
        this.speedExtra = 0.0;
        this.angle = Math.PI / 3.0;
        this.ballX = this.width / 2;
        this.ballY = this.height - this.ballRadius;
        this.moveBall(0);
        // brick ids to remove (negative numbers - only change color to black)
        this.bq = [];
        // game events queue
        this.eq = [];
        // sound effects queue
        this.sq = [];
        // start game
        this.state = 1; // ACTIVE
    }
    async loadGameData() {
        return new Promise( async (resolve) => {
            if (this.err) {
                resolve();
                return;
            }
            try {
                const response = await fetch('game.json');
                const data = await response.json();
                if (data && ('title' in data))
                    this.title = data.title;
                if (data && ('levels' in data))
                    this.levels = data.levels;
            } catch (error) {
                this.err = 2; // ERROR
                this.errMsg = 'Error loading game data:' + error;
            } finally {
                resolve();
            }
        });
    }
    loadLevel(level = null) {
        if (this.DEBUG)
            console.log(`loadLevel ${level}`);
        this.bricks.splice(1, this.bricks.length - 1);
        if (level === null) {
            level = 0;
            this.score = 0;
        }
        if (level >= this.levels.length)
            return;
        this.level = level;
        this.statusTitle = this.levels[level].title;
        let id = 1;
        for (let i = 0; i < this.levels[level].bricks.length; ++i) {
            let [ypos, xpos, type, color, count] = this.levels[level].bricks[i];
            while (count-- > 0) {
                let left = xpos * this.BRICK_WIDTH;
                let right = left + this.BRICK_WIDTH;
                if (right > this.width) break;
                let top = this.BRICK_HEIGHT * ypos;
                let bottom = top + this.BRICK_HEIGHT;
                this.bricks.push([left, right, top, bottom, id++, type, color]);
                ++xpos;
            }
        }
        this.newGame();
    }
    movePaddleLeft(delta) {
        this.eq.push({type: 1, time: this.time + delta});
    }
    movePaddleRight(delta) {
        this.eq.push({type: 2, time: this.time + delta});
    }
    movePaddlePos(delta, pos) {
        this.eq.push({type: 9, time: this.time + delta, param: pos});
    }
    releaseBall(delta = 0) {
        if (this.ballOnPaddle)
            this.eq.push({type: 10, time: this.time + delta});
    }
    queueBounce() {
        this.speed += this.speedExtra;
        this.speedExtra = 0;
        if (this.angle > Math.PI) 
            this.angle -= Math.PI + Math.PI;
        var sina = Math.sin(this.angle);
        var cosa = Math.cos(this.angle);
        var minTime = Infinity;
        var minIdx = -1;
        var minType = -1;
        var hspeed = this.speed * cosa;
        var vspeed = this.speed * sina;
        // special case : paddle line collision
        if (this.state != 3 && sina > 0 && this.ballBottom < this.height) {
            minType = 5;
            minTime = (this.height - this.ballBottom) / vspeed; // minTime > 0
        }
        // bricks collisions
        for (let i = 0; i < this.bricks.length; ++i) {
            let [x1, x2, y1, y2, id, type, color] = this.bricks[i];
            let vdist = sina > 0 ?
                y1 - this.ballBottom : // ball moves down
                this.ballTop - y2; // ball moves up
            let hdist = cosa > 0 ?
                x1 - this.ballRight : // ball moves right
                this.ballLeft - x2; // ball moves left
            if (type == 1) { // special case: game area
                vdist = sina > 0 ? y2 - this.ballBottom : this.ballTop - y1;
                hdist = cosa > 0 ? x2 - this.ballRight : this.ballLeft - x1;
            }
            if (vdist > 0) {
                var vtime = vdist / Math.abs(vspeed);
                var nextX = this.ballX + hspeed * vtime;
                if (nextX >= x1 && nextX <= x2 && vtime < minTime) {
                    minTime = vtime;
                    minType = 3; // horizontal bounce
                    minIdx = i;
                }
            }
            if (hdist > 0) {
                var htime = hdist / Math.abs(hspeed);
                var nextY = this.ballY + vspeed * htime;
                if (nextY >= y1 && nextY <= y2 && htime < minTime) {
                    minTime = htime;
                    minType = 4; // vertical bounce
                    minIdx = i;
                }
            }
            // special case: corner bounce
            if (vdist > 0 && hdist > 0) {
                let dy = sina > 0 ? y1 - nextY : nextY - y2;
                let dx = cosa > 0 ? x1 - nextX : nextX - x2;
                if (dx > 0 && dy > 0) {
                    if (dx < dy) {
                        if (vtime < minTime) {
                            minTime = vtime;
                            minType = 3; // horizontal bounce
                            minIdx = i;
                        }
                    } else {
                        if (htime < minTime) {
                            minTime = htime;
                            minType = 4; // vertical bounce
                            minIdx = i;
                        }
                    }
                }
            }
        }
        // push event
        if (minType != -1) {
            if (this.DEBUG)
                console.log(`bounce queued x=${this.ballX.toFixed(2)} y=${this.ballY.toFixed(2)} dtime=${minTime.toFixed(2)} id=${minIdx >= 0 ? this.bricks[minIdx][4] : minIdx} angle=${this.angle.toFixed(4)}`);
            var eventObject = {type: minType, time: this.time + minTime, param: minIdx};
            this.eq.push(eventObject);
            if (minType != 5) {
                this.sq.push(eventObject); }
        }
    }
    processEvent(ev) {
        switch (ev.type) {
            case 10: // release ball
                this.eq.push({type: 3, time: this.time}); // horizontal bounce
                this.eq.push({type: 7, time: this.time + this.scoreInterval}); // score for time
                this.eq.push({type: 8, time: this.time + this.speedInterval});  // speed up 
                this.ballOnPaddle = false;
                break;
            case 1: // paddle left
                this.paddleLeft -= 32;
                if (this.paddleLeft < 0) {
                    this.paddleLeft = 0; }
                this.paddleX = this.paddleLeft + this.paddleHalf;
                this.paddleRight = this.paddleLeft + this.paddleWidth;
                if (this.ballOnPaddle) {
                    this.ballX = this.paddleX;
                    this.moveBall(0);
                }
                break;
            case 2: // paddle right
                this.paddleRight += 32;
                if (this.paddleRight > this.width) {
                    this.paddleRight = this.width; }
                this.paddleLeft = this.paddleRight - this.paddleWidth;
                this.paddleX = this.paddleLeft + this.paddleHalf;
                if (this.ballOnPaddle) {
                    this.ballX = this.paddleX;
                    this.moveBall(0);
                }
                break;
            case 9: // paddle move to pos (mouse or touch)
                var newX = ev.param;
                if (newX + this.paddleHalf > this.width) {
                    newX = this.width - this.paddleHalf; }
                if (newX - this.paddleHalf < 0) {
                    newX = this.paddleHalf; }
                // if (newX > this.paddleX) {
                //     if (newX - this.paddleX > 10)
                //         newX = this.paddleX + 10;
                // } else {
                //     if (this.paddleX - newX > 10)
                //         newX = this.paddleX - 10;
                // }
                this.paddleX = newX;
                this.paddleLeft = newX - this.paddleHalf;
                this.paddleRight = newX + this.paddleHalf;
                if (this.ballOnPaddle) {
                    this.ballX = this.paddleX;
                    this.moveBall(0);
                }
                break;
            case 3: // horizontal bounce
            case 5: // horizontal paddle bounce
            case 4: // vertical bounce
                this.moveBall(ev.time - this.time);
                if (ev.type == 3) { // horizontal bounce
                    this.angle = - this.angle;
                } else if (ev.type == 5) { // horizontal paddle bounce
                    if (this.ballX <= this.paddleRight && this.ballX >= this.paddleLeft) {
                        let paddleEight = this.paddleHalf * 0.25;
                        if (this.ballX <= this.paddleLeft + paddleEight) {
                            this.angle = - this.angle - this.paddleAngle3;
                        } else if (this.ballX <= this.paddleLeft + paddleEight + paddleEight) {
                            this.angle = - this.angle - this.paddleAngle2;
                        } else if (this.ballX <= this.paddleLeft + paddleEight + paddleEight + paddleEight) {
                            this.angle = - this.angle - this.paddleAngle1;
                        } else if (this.ballX >= this.paddleRight - paddleEight) {
                            this.angle = - this.angle + this.paddleAngle3;
                        } else if (this.ballX >= this.paddleRight - paddleEight - paddleEight) {
                            this.angle = - this.angle + this.paddleAngle2;
                        } else if (this.ballX >= this.paddleRight - paddleEight - paddleEight - paddleEight) {
                            this.angle = - this.angle + this.paddleAngle1;
                        } else {
                            this.angle = - this.angle;
                        }
                        this.sq.push({type: 5, time: this.time}); // paddle sound
                    } else {
                        // paddle misses the ball
                        var sina = Math.sin(this.angle);
                        var vspeed = (this.speed + this.speedExtra) * sina;
                        var gameEndTime = Math.round(this.time + this.footerHeight / vspeed);
                        let eventObject = {type: 6, time: gameEndTime};
                        this.eq.push(eventObject);
                        this.sq.push(eventObject); // gameOver sound
                        this.state = 3; // BALL MISSED
                    }
                } else if (ev.type == 4) { // vertical bounce 
                    this.angle = Math.PI - this.angle;
                }
                let brickIdx = 'param' in ev ? ev.param : -1;
                if (brickIdx > 0) { // brickIdx == 0 - game area
                    let type = this.bricks[brickIdx][5];
                    if (type == 3) {// silver
                        this.bricks[brickIdx][5] = 2;
                        this.bq.push(-this.bricks[brickIdx][4]); // change color
                    } else if (type == 2) { // regular
                        this.bq.push(this.bricks[brickIdx][4]);
                        this.bricks.splice(brickIdx, 1);
                        this.score += this.SCORE_BRICK_DESTROY;
                        this.checkForVictory();
                    }
                    // type == 4 gold - persistent
                }
                this.queueBounce();
                break;
            case 6: // game over
                this.state = 6; // GAME LOST
                this.statusTitle = 'Game Over!';
                break;
            case 7: // score for time
                this.moveBall(ev.time - this.time);
                if (! this.ballOnPaddle)
                    this.score += Math.round(this.speed * 10);
                this.eq.push({type: 7, time: this.time + this.scoreInterval}); 
                break;
            case 8: // speed up
                this.moveBall(ev.time - this.time);
                this.speedExtra += 0.05;
                this.eq.push({type: 8, time: this.time + this.speedInterval}); 
                break;
        }
    }
    checkForVictory() {
        for (let i = 0; i < this.bricks.length; ++i) 
            if (this.bricks[i][5] == 2 || this.bricks[i][5] == 3) // type
                return;
        this.statusTitle = 'Victory!';
        this.state = 7;
        this.sq.push({type: 7, time: this.time}); // Victory sound
    }
    moveBall(delta) {
        if (! this.ballOnPaddle) {
            this.ballX += delta * this.speed * Math.cos(this.angle);
            this.ballY += delta * this.speed * Math.sin(this.angle);
        }
        this.ballTop = this.ballY - this.ballRadius;
        this.ballBottom = this.ballY + this.ballRadius;
        this.ballLeft = this.ballX - this.ballRadius;
        this.ballRight = this.ballX + this.ballRadius;
        this.time += delta;
    }
    timeStep(increment) {
        var endTime = this.time + increment;
        while (true) {
            var minIdx = -1; 
            var minTime = Infinity;
            for (let i = 0; i < this.eq.length; ++i) {
                if (this.eq[i].time < minTime) {
                    minTime = this.eq[i].time;
                    minIdx = i;
                }
            }
            if (minTime <= endTime) {
                this.processEvent(this.eq[minIdx]);
                this.eq.splice(minIdx, 1);
            } else {
                break;
            }
        }
        this.moveBall(endTime - this.time);
    }
}

class GameView {
    constructor(model) {
        this.DEBUG = false;
        // Model
        this.m = model;
        // game area
        this.game = document.getElementById("game");
        // Info panel
        this.info = document.getElementById("info");
        this.scoreval = document.getElementById("scoreval");
        this.status = document.getElementById("status");
        this.gear = document.getElementById("gear");
        // Status Title
        this.MAIN_STATUS_TIMEOUT = 2000;
        this.mainstatus = document.getElementById("mainstatus");
        document.title = this.m.title;
        // ball
        this.ball = document.getElementById("ball");
        this.newGame();
        // paddle
        this.paddle = document.getElementById("paddle");
        // relative size
        this.coef = 1.0;
        this.resize();
        // Initialize Audio
        this.soundKeys = ['bounce', 'bounce2', 'gold', 'paddle', 'gameOver', 'win', 'music'];
        this.sounds = {};
        this.soundInitialized = false;
    }
    initSound() {
        for (const key of this.soundKeys) {
            let sound = new Audio(`sound/${key}.mp3`);
            sound.volume = 0;
            sound.play().then(async () => { sound.pause(); sound.volume = 1; });
            this.sounds[key] = sound;
        }
    }
    render() {
        this.ball.style.top = `${Math.round(this.m.ballTop * this.coef)}px`;
        this.ball.style.left = `${Math.round(this.m.ballLeft * this.coef)}px`;
        this.paddle.style.left = `${Math.round(this.m.paddleLeft * this.coef)}px`;
        this.scoreval.innerHTML = this.m.score;
    }
    resize(ev) {
        this.coef = 1.0;
        let wcoef = (innerWidth - 2) / (this.m.width);
        let hcoef = (innerHeight - 12) / (this.m.height + this.m.footerHeight);
        let mincoef = Math.min(wcoef, hcoef);
        if (mincoef >= 1.20 || mincoef < 1.0)
            this.coef = mincoef;
        // game area
        let width = Math.round(this.coef * this.m.width);
        let height = Math.round((this.m.height + this.m.footerHeight) * this.coef);
        this.game.style.width = `${width}px`;
        this.game.style.height = `${height}px`;
        let leftMargin = Math.ceil((innerWidth - 2 - width) * 0.5);
        this.game.style.marginLeft = `${leftMargin}px`;
        this.info.style.bottom = `${Math.floor(this.coef * 15) - 3}px`;
        let infoFontSize = width < 300 ? '1.5vh' : '2.2vh';
        let infoGearSize = width < 300 ? '1.5vh' : '2.5vh';
        this.info.style.fontSize = infoFontSize;
        this.gear.style.width = infoGearSize;
        // ball
        let radius = Math.round(this.m.ballRadius * this.coef);
        this.ball.style.width = `${radius + radius}px`;
        this.ball.style.height = `${radius + radius}px`;
        this.ball.style.borderRadius = `${radius}px`;
        // paddle
        let paddleWidth = Math.round(this.m.paddleWidth * this.coef);
        let paddleHeight = Math.round(this.m.paddleHeight * this.coef);
        let paddleTop = Math.round(this.m.paddleTop * this.coef);
        this.paddle.style.width = `${paddleWidth}px`;
        this.paddle.style.height = `${paddleHeight}px`;
        this.paddle.style.top = `${paddleTop}px`;
        // bricks
        for (let i = 0; i < this.m.bricks.length; ++i) {
            let [x1, x2, y1, y2, id, type, color] = this.m.bricks[i];
            if (type == 1) continue; // game area
            var newBrick = document.getElementById(`brick-${id}`);
            if (! newBrick) continue;
            x1 = Math.round(x1 * this.coef);
            x2 = Math.round(x2 * this.coef);
            y1 = Math.round(y1 * this.coef);
            y2 = Math.round(y2 * this.coef);
            newBrick.style.top = `${y1 + 1}px`;
            newBrick.style.left = `${x1 + 1}px`;
            newBrick.style.width = `${x2 - x1 - 2}px`;
            newBrick.style.height = `${y2 - y1 - 2}px`;
        }
        // draw objects
        this.render();
    }
    async showMainStatus() {
        this.render();
        // remove existing bricks
        const elementsToRemove = document.querySelectorAll('.brick');
        elementsToRemove.forEach(el => el.parentNode.removeChild(el));
        // hide Ball
        this.ball.style.visibility = 'hidden';
        // Text elements
        this.status.style.display = 'none';
        this.mainstatus.innerHTML = this.m.statusTitle;
        this.mainstatus.classList.remove('msg-err');
        this.mainstatus.classList.add('msg-ok');
        this.mainstatus.style.display = 'block';
        // sleep
        return new Promise( async (resolve) => 
            setTimeout(resolve, this.MAIN_STATUS_TIMEOUT) );
    }
    newGame() {
        this.mainstatus.style.display = 'none';
        // show Ball
        this.ball.style.visibility = 'visible';
        // bricks
        for (let i = 0; i < this.m.bricks.length; ++i) {
            let [x1, x2, y1, y2, id, type, color] = this.m.bricks[i];
            if (type == 1) continue; // game area
            const newBrick = document.createElement('div');
            newBrick.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
            x1 = Math.round(x1 * this.coef);
            x2 = Math.round(x2 * this.coef);
            y1 = Math.round(y1 * this.coef);
            y2 = Math.round(y2 * this.coef);
            newBrick.style.top = `${y1 + 1}px`;
            newBrick.style.left = `${x1 + 1}px`;
            newBrick.style.width = `${x2 - x1 - 3}px`;
            newBrick.style.height = `${y2 - y1 - 3}px`;
            newBrick.id = `brick-${id}`;
            newBrick.className = 'brick';
            this.game.appendChild(newBrick);
        }
        // Text elements
        this.status.innerHTML = this.m.statusTitle;
        this.status.classList.remove('msg-err');
        this.status.classList.add('msg-ok');
        this.status.style.display = 'inline';
    }
    endGame() {
        this.ball.style.visibility = 'hidden';
        this.status.style.display = 'none';
        this.status.innerHTML = this.m.statusTitle;
        this.mainstatus.innerHTML = this.m.statusTitle;
        this.mainstatus.classList.remove('msg-ok');
        this.mainstatus.classList.remove('msg-err');
        if (this.m.state == 6) { // Game Over!
            this.mainstatus.classList.add('msg-err');
        } else { // lose
            this.mainstatus.classList.add('msg-ok');
        }
        this.mainstatus.style.display = 'block';
    }
    // id > 0 - remove brick, id < 0 - change color
    removeBrick(id) {
        let toDelete = true;
        if (id < 0) { 
            id = - id; 
            toDelete = false;
        }
        const el = document.getElementById(`brick-${id}`);
        if (el) {
            if (toDelete)
                el.parentNode.removeChild(el);
            else
                el.style.backgroundColor = '#333333';
        }
    }
    playSound(sound) {
        if (this.DEBUG)
            console.log(`play ${sound} ended=${this.sounds[sound].ended}`);
        if (sound in this.sounds) {
            this.sounds[sound].currentTime = 0;
            this.sounds[sound].play();
        }
    }
    playMusic(on) {
        if ('music' in this.sounds) {
            if (this.DEBUG)
                console.log(`obj=${this.sounds['music']} on=${on}`);
            var music = this.sounds['music'];
            if (on) {
                music.loop = true;
                if (music.readyState >= 2)
                    music.play();
                else
                    music.addEventListener('canplaythrough', this.playMusicWhenReady, false);
            } else {
                document.removeEventListener('canplaythrough', this.playMusicWhenReady, false);
                music.pause();
            }
        }
    }
    playMusicWhenReady(e) {
        e.target.play();
    }
}

class GameController {
    constructor() {
        this.DEBUG = false;
        // Model, View
        this.m = null;
        this.v = null;
        // const BORDER_WIDTH = 10;
        // var width = innerWidth - BORDER_WIDTH * 2;
        // var height = innerHeight - BORDER_WIDTH * 2;
        this.m = new GameModel();
        this.m.loadGameData().then( result => {
            if (this.m.err) {
                if (this.m.state != 1)
                    throw new Error('ERROR:' + this.m.errMsg);
                else
                    console.log('ERROR:' + this.m.errMsg);
            }
            this.v = new GameView(this.m);
            // Key handlers
            this.keyListener = this.keyListener.bind(this);
            document.addEventListener('keydown', this.keyListener, false);
            // mouse
            this.isDrag = false;
            this.mouseDown = this.mouseDown.bind(this);
            this.mouseMove = this.mouseMove.bind(this);
            this.mouseUp = this.mouseUp.bind(this);
            this.gameAreaClick = this.gameAreaClick.bind(this);
            this.v.game.addEventListener('mousedown', this.mouseDown, false);
            this.v.game.addEventListener('mousemove', this.mouseMove, false);
            this.v.game.addEventListener('mouseup', this.mouseUp, false);
            // touch
            this.v.game.addEventListener('touchstart', this.mouseDown, false);
            this.v.game.addEventListener('touchmove', this.mouseMove, false);
            this.v.game.addEventListener('touchend', this.mouseUp, false);
            // click to release ball
            this.v.game.addEventListener('click', this.gameAreaClick, false);
            // window resize
            window.addEventListener('resize', this.resize.bind(this));
            // New Game
            this.startNewGame(null);
            this.gameAreaShift = this.v.game.getBoundingClientRect().left;
        });
        // Settings
        this.toPlaySounds = false;
        this.toPlayMusic = false;
        // settings element
        this.PLAN_SOUNDS_TIME = 200;
        this.gearBtn = document.getElementById("gear");
        this.doneBtn = document.getElementById("done");
        this.newBtn = document.getElementById("new");
        this.nextBtn = document.getElementById("next");
        this.controls = document.getElementById("controls");
        this.active = true;
        this.controls.hidden = this.active;
        this.showControls = this.showControls.bind(this);
        this.gearBtn.addEventListener('click', this.showControls, false);
        this.doneBtn.addEventListener('click', this.showControls, false);
        this.newBtn.addEventListener('click', this.newGameClick.bind(this), false);
        this.nextBtn.addEventListener('click', this.nextLevelClick.bind(this), false);
        this.soundCheck = document.getElementById("sound");
        this.musicCheck = document.getElementById("music");
        this.soundCheck.checked = this.toPlaySounds;
        this.musicCheck.checked = this.toPlayMusic;
        this.soundCheck.addEventListener('click', this.setSound.bind(this), false);
        this.musicCheck.addEventListener('click', this.setMusic.bind(this), false);
        // Game steps
        this.step = this.step.bind(this);
    }
    kill() {
        document.removeEventListener('keydown', this.keyListener, false);
        if (this.timer) {
            window.cancelAnimationFrame(this.timer); }
    }
    startNewGame(level) {
        if (this.m.levels.length > 0) { // Campain
            this.m.loadLevel(level);
            this.v.showMainStatus().then((result) => {
                this.v.newGame();
                this.perfTime = performance.now();
                this.timer = requestAnimationFrame(this.step);
            });
        } else { // Else - Free Bounce
            this.m.newGame();
            this.v.newGame();
        }
    }
    step() {
        if (this.m.state == 6) { // Game over
            this.v.endGame();
            return;
        } else if (this.m.state == 7) { // Level complete
            if (this.m.level + 1 < this.m.levels.length) {
                this.startNewGame(this.m.level + 1);
            } else {
                this.v.endGame(); // Victory
            }
            return;
        }
        var newTime = performance.now();
        this.m.timeStep(newTime - this.perfTime);
        this.processSoundEvents();
        this.processBricks();
        this.perfTime = newTime;
        this.v.render();
        this.timer = requestAnimationFrame(this.step);
    }
    resize(e) {
        this.v.resize();
        this.gameAreaShift = this.v.game.getBoundingClientRect().left;
    }
    processSoundEvents() {
        for (let i = 0; i < this.m.sq.length; ++i) { // process sound events
            var soundEvent = this.m.sq[i];
            var delta = Math.round(soundEvent.time - this.m.time);
            if (delta > this.PLAN_SOUNDS_TIME)
                continue;
            if (this.toPlaySounds) {
                let type = 'param' in soundEvent && soundEvent.param >= 0 ? 
                    this.m.bricks[soundEvent.param][5] : -1;
                var sound = '';
                switch (soundEvent.type) {
                    case 3:
                    case 4: sound = type == 2 ? 'bounce2' : type == 1 ? 'bounce' : 'gold'; break;
                    case 5: sound = 'paddle'; break;
                    case 6: sound = 'gameOver'; break;
                    case 7: sound = 'win'; break;
                }
                if (this.DEBUG)
                    console.log(`plan to play ${sound} in ${delta} time`);
                if (delta <= 0) {
                    this.v.playSound(sound);
                } else {
                    setTimeout(() => { this.v.playSound(sound); }, delta);
                }
            }
            this.m.sq.splice(i, 1);
        }
    }
    processBricks() {
        for (let i = 0; i < this.m.bq.length; ++i) { // process removed bricks
            this.v.removeBrick(this.m.bq[i]);
            this.m.bq.splice(i, 1);
        }
    }
    keyListener(e) {
        var key = e.keyCode;
        var delta = Math.round(performance.now() - this.perfTime);
        if (key == 37 || key == 65) {
            this.m.movePaddleLeft(delta);
        } else if (key == 39 || key == 68) {
            this.m.movePaddleRight(delta);
        } else if (e.key === "Escape") {
            this.showControls();
        }
    }
    gameAreaClick(e) {
        if (this.active && this.m.state == 1 && this.m.ballOnPaddle) {
            this.m.releaseBall(); }
    }
    mouseDown(e) {
        this.isDrag = true;
        this.v.game.style.cursor = 'pointer';
        //this.v.paddle.style.cursor = 'none';
    }
    mouseUp(e) {
        this.isDrag = false;
        this.v.game.style.cursor = 'default';
        //this.v.paddle.style.cursor = 'pointer';
    }
    mouseMove(e) {
        if (this.isDrag) {
            e.preventDefault();
            var delta = Math.round(performance.now() - this.perfTime);
            if (e && ('clientX' in e || 'targetTouches' in e )) {
                var posX = e.clientX || e.targetTouches[0].pageX;
                this.m.movePaddlePos(delta, (posX - this.gameAreaShift) / this.v.coef);
                if (this.DEBUG)
                    console.log(`mouse move posx=${posX} coef=${this.v.coef} shift=${this.gameAreaShift}`);
            }
        }
    }
    setSound(e) {
        this.toPlaySounds = this.soundCheck.checked;
        if (this.toPlaySounds && 
            (! this.v.soundInitialized || this.v.sounds['bounce'] == null)) 
        {
            this.v.initSound();
            this.v.soundInitialized = true;
            if (this.DEBUG)
                console.log('sound initialized');
        }
    }
    setMusic(e) {
        this.toPlayMusic = this.musicCheck.checked;
        if (this.toPlayMusic && ! this.v.soundInitialized) {
            this.v.initSound();
            this.v.soundInitialized = true;
        }
        this.v.playMusic(this.toPlayMusic);
    }
    showControls(e) {
        this.active = ! this.active;
        this.controls.hidden = this.active;
        if (! this.active) { // pause
            if (this.timer) {
                window.cancelAnimationFrame(this.timer); }
        } else { // resume
            this.perfTime = performance.now();
            this.timer = requestAnimationFrame(this.step);
        }
    }
    newGameClick(e) {
        this.active = true;
        this.controls.hidden = this.active;
        this.startNewGame(null);
    }
    nextLevelClick(e) {
        this.active = true;
        this.controls.hidden = this.active;
        this.startNewGame((this.m.level + 1) % this.m.levels.length);
    }
}

if (typeof(window.newGame) === 'undefined') {
    window.newGame = (ev) => { new GameController(); }
}

window.addEventListener('load', newGame);
