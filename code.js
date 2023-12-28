class GameModel {
    constructor(width, height) {
        const MIN_WIDTH = 128;
        const MIN_HEIGHT = 64;
        // 0 - init, 1 - active, 2 - pause, 3 - missed, 666 - game over
        this.state = 0; // INITIALIZATION
        this.time = 0;
        this.err = 0; // OK
        this.errMsg = ''; // OK
        this.score = 0;
        this.scoreInterval = 1000; // 1 score for speed 0.1 each 1s
        this.speedInterval = 20 * 1000; // speed up each 20s
        if (width < MIN_WIDTH || height < MIN_HEIGHT) {
            this.err = 1; // ERROR
            this.errMsg = 'Width or Height is not enough for game';
        }
        // Game Area parameters
        this.width = width;
        this.footerHeight = 48;
        this.height = height - this.footerHeight;
        // paddle
        this.paddleHeight = 16;
        this.paddleHalf = 32;
        this.paddleWidth = this.paddleHalf * 2;
        this.paddleX = this.width / 2;
        this.paddleTop = this.height;
        this.paddleLeft = this.paddleX - this.paddleHalf;
        this.paddleRight = this.paddleX + this.paddleHalf;
        // ball
        this.speed = 0.1;
        this.speedExtra = 0.0;
        this.angle = Math.PI / 3.0;
        this.ballRadius = 8;
        this.ballDiam = this.ballRadius * 2;
        this.ballX = this.width / 2;
        this.ballY = this.height - this.ballRadius;
        this.moveBall(0);
        // horizontal planes
        this.hp = [];
        this.hp.push({y: 0, x1: 0, x2: this.width, type: 1});
        this.hp.push({y: this.height, x1: 0, x2: this.width, type: 2});
        // vertical planes
        this.vp = [];
        this.vp.push({y1: 0, y2: this.height + this.footerHeight, x: 0, type: 1});
        this.vp.push({y1: 0, y2: this.height + this.footerHeight, x: this.width, type: 1});
        // game evens queue
        this.eq = [];
        this.eq.push({type: 3, time: this.time}); // horizontal bounce
        this.eq.push({type: 7, time: this.time + this.scoreInterval}); // score for time
        this.eq.push({type: 8, time: this.time + this.speedInterval});  // speed up 
        // sound effects queue
        this.sq = [];
        // start game
        if (! this.err) {
            this.state = 1; // ACTIVE
        }
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
    queueBounce() {
        this.speed += this.speedExtra;
        this.speedExtra = 0;
        var sina = Math.sin(this.angle);
        var cosa = Math.cos(this.angle);
        var minHTime = Infinity, minVTime = Infinity;
        var minHIdx = -1, minVIdx = -1;
        var hspeed = this.speed * cosa;
        var vspeed = this.speed * sina;
        // check all horizontal segments
        for (let i = 0; i < this.hp.length; ++i) {
            let segment = this.hp[i];
            var vdist = sina > 0 ?
                segment.y - this.ballBottom : // ball moves down
                this.ballTop - segment.y; // ball moves up
            if (vdist <= 0)
                continue;
            var dtime = vdist / Math.abs(vspeed);
            var nextX = this.ballX + hspeed * dtime;
            if (nextX > segment.x2 || nextX < segment.x1)
                continue;
            if (dtime < minHTime) {
                minHIdx = i;
                minHTime = dtime;
            }
        }
        // check all vertical segments
        for (let i = 0; i < this.vp.length; ++i) {
            let segment = this.vp[i];
            var hdist = cosa > 0 ? 
                segment.x - this.ballRight : // ball moves right
                this.ballLeft - segment.x ; // ball moves left
            if (hdist <= 0)
                continue;
            var dtime = hdist / Math.abs(hspeed);
            var nextY = this.ballY + vspeed * dtime;
            if (nextY > segment.y2 || nextY < segment.y1)
                continue;
            if (dtime < minVTime) {
                minVIdx = i;
                minVTime = dtime;
            }
        }
        if (minHTime == Infinity && minVTime == Infinity)
            return;
        if (minHTime < minVTime) {
            if (this.hp[minHIdx].type == 2) { // paddle line
                if (this.state != 3) {
                    this.eq.push({type: 5, time: this.time + minHTime}); // paddle bounce
                }
            } else { // top horizontal line
                this.eq.push({type: 3, time: this.time + minHTime}); // horizontal bounce
                this.sq.push({type: 3, time: this.time + minHTime, sound: 'bounce'});
            }
        } else {
            this.eq.push({type: 4, time: this.time + minVTime}); // vertical bounce
            this.sq.push({type: 4, time: this.time + minVTime, sound: 'bounce'});
        }
    }
    processEvent(ev) {
        console.log(ev);
        switch (ev.type) {
            case 1: // paddle left
                this.paddleLeft -= 32;
                if (this.paddleLeft < 0) {
                    this.paddleLeft = 0; }
                this.paddleX = this.paddleLeft + this.paddleHalf;
                this.paddleRight = this.paddleLeft + this.paddleWidth;
                break;
            case 2: // paddle right
                this.paddleRight += 32;
                if (this.paddleRight > this.width) {
                    this.paddleRight = this.width; }
                this.paddleLeft = this.paddleRight - this.paddleWidth;
                this.paddleX = this.paddleLeft + this.paddleHalf;
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
                break;
            case 3: // horizontal bounce
            case 5: // horizontal paddle bounce
            case 4: // vertical bounce
                this.moveBall(ev.time - this.time)
                if (ev.type == 3) { // horizontal bounce
                    this.angle = - this.angle;
                } else if (ev.type == 5) { // horizontal paddle bounce
                    if (this.ballX <= this.paddleRight && this.ballX >= this.paddleLeft) {
                        this.angle = - this.angle;
                        this.sq.push({type: 5, time: this.time, sound: 'paddle'});
                    } else {
                        // paddle misses the ball
                        var sina = Math.sin(this.angle);
                        var vspeed = (this.speed + this.speedExtra) * sina;
                        var gameEndTime = Math.round(this.time + this.footerHeight / vspeed);
                        this.eq.push({type: 6, time: gameEndTime});
                        this.sq.push({type: 6, time: gameEndTime, sound: 'gameOver'});
                        this.state = 3; // BALL MISSED
                    }
                } else if (ev.type == 4) { // vertical bounce 
                    this.angle = Math.PI - this.angle;
                }
                this.queueBounce();
                break;
            case 6: // game over
                this.state = 666; // GAME LOST
                break;
            case 7: // score for time
                this.score += Math.round(this.speed * 10);
                this.eq.push({type: 7, time: this.time + this.scoreInterval}); 
                break;
            case 8: // speed up
                this.speedExtra += 0.1;
                this.eq.push({type: 8, time: this.time + this.speedInterval}); 
                break;
        }
    }
    moveBall(delta) {
        this.ballX += delta * this.speed * Math.cos(this.angle);
        this.ballY += delta * this.speed * Math.sin(this.angle);
        this.ballTop = this.ballY - this.ballRadius;
        this.ballBottom = this.ballY + this.ballRadius;
        this.ballLeft = this.ballX - this.ballRadius;
        this.ballRight = this.ballX + this.ballRadius;
        this.time += delta;
    }
    timeStep(increment) {
        //console.log(`model step time = ${this.time}`)
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
    constructor(model, width, height) {
        // Model
        this.m = model;
        // game area
        this.game = document.getElementById("game");
        this.game.style.width = `${width}px`;
        this.game.style.height = `${height}px`;
        // Info panel
        this.info = document.getElementById("info");
        this.info.style.bottom = '10px';
        this.info.style.top = 'auto';
        this.scoreval = document.getElementById("scoreval");
        this.status = document.getElementById("status");
        // ball
        this.ball = document.getElementById("ball");
        this.ball.style.width = `${this.m.ballDiam}px`;
        this.ball.style.height = `${this.m.ballDiam}px`;
        this.ball.style.borderRadius = `${this.m.ballRadius}px`;
        this.newGame();
        // paddle
        this.paddle = document.getElementById("paddle");
        this.paddle.style.width = `${this.m.paddleWidth}px`;
        this.paddle.style.height = `${this.m.paddleHeight}px`;
        this.paddle.style.top = `${this.m.paddleTop}px`;
        // Initialize Audio
        this.soundKeys = ['bounce', 'bounce2', 'paddle', 'gameOver', 'music'];
        this.sounds = {};
        this.soundInitialized = false;
        // draw objects
        this.render();
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
        this.ball.style.top = `${Math.round(this.m.ballTop)}px`;
        this.ball.style.left = `${Math.round(this.m.ballLeft)}px`;
        this.paddle.style.left = `${Math.round(this.m.paddleLeft)}px`;
        this.scoreval.innerHTML = this.m.score;
    }
    newGame() {
        this.ball.style.visibility = 'visible';
        this.status.innerHTML = "Level 1";
        this.status.classList.remove('msg-err');
        this.status.classList.add('msg-ok');
    }
    endGame() {
        this.ball.style.visibility = 'hidden';
        this.status.innerHTML = "Game Over";
        this.status.classList.remove('msg-ok');
        this.status.classList.add('msg-err');
    }
    playSound(sound) {
        console.log(`play ${sound} obj=${this.sounds[sound]}`)
        if (sound in this.sounds)
            this.sounds[sound].play();
    }
    playMusic(on) {
        if ('music' in this.sounds) {
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
    constructor(model, view) {
        // Model, View
        this.m = model;
        this.v = view;
        var rect = this.v.game.getBoundingClientRect();
        this.gameAreaShift = rect.left;
        // Key handlers
        this.keyListener = this.keyListener.bind(this);
        document.addEventListener('keydown', this.keyListener, false);
        // mouse
        this.isDrag = false;
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
        this.v.game.addEventListener('mousedown', this.mouseDown, false);
        this.v.game.addEventListener('mousemove', this.mouseMove, false);
        this.v.game.addEventListener('mouseup', this.mouseUp, false);
        // touch
        this.v.game.addEventListener('touchstart', this.mouseDown, false);
        this.v.game.addEventListener('touchmove', this.mouseMove, false);
        this.v.game.addEventListener('touchend', this.mouseUp, false);
        // Game steps
        this.step = this.step.bind(this);
        this.timer = 0;
        this.perfTime = performance.now();
        this.timer = requestAnimationFrame(this.step);
        // Settings
        this.toPlaySounds = false;
        this.toPlayMusic = false;
        // settings element
        this.PLAN_SOUNDS_TIME = 200;
        this.gearBtn = document.getElementById("gear");
        this.doneBtn = document.getElementById("done");
        this.newBtn = document.getElementById("new");
        this.controls = document.getElementById("controls");
        this.active = true;
        this.controls.hidden = this.active;
        this.showControls = this.showControls.bind(this);
        this.gearBtn.addEventListener('click', this.showControls, false);
        this.doneBtn.addEventListener('click', this.showControls, false);
        this.newBtn.addEventListener('click', this.newGameClick.bind(this), false);
        this.soundCheck = document.getElementById("sound");
        this.musicCheck = document.getElementById("music");
        this.soundCheck.checked = this.toPlaySounds;
        this.musicCheck.checked = this.toPlayMusic;
        this.soundCheck.addEventListener('click', this.setSound.bind(this), false);
        this.musicCheck.addEventListener('click', this.setMusic.bind(this), false);
    }
    kill() {
        document.removeEventListener('keydown', this.keyListener, false);
        if (this.timer) {
            window.cancelAnimationFrame(this.timer); }
    }
    step() {
        if (this.m.state == 666) { // Game over
            this.v.endGame();
            return;
        }
        var newTime = performance.now();
        this.m.timeStep(newTime - this.perfTime);
        for (let i = 0; i < this.m.sq.length; ++i) { // process sound events
            var soundEvent = this.m.sq[i];
            var delta = Math.round(soundEvent.time - this.m.time);
            if (delta > this.PLAN_SOUNDS_TIME)
                continue;
            if (this.toPlaySounds) {
                console.log(`plan to play ${soundEvent.sound} in ${delta} time`);
                if (delta <= 0) {
                    this.v.playSound(soundEvent.sound);
                } else {
                    setTimeout(() => { this.v.playSound(soundEvent.sound); }, delta);
                }
            }
            this.m.sq.splice(i, 1);
        }
        this.perfTime = newTime;
        this.v.render();
        this.timer = requestAnimationFrame(this.step);
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
    mouseDown(e) {
        this.isDrag = true;
        this.v.game.style.cursor = 'none';
        this.v.paddle.style.cursor = 'none';
    }
    mouseUp(e) {
        this.isDrag = false;
        this.v.game.style.cursor = 'default';
        this.v.paddle.style.cursor = 'pointer';
    }
    mouseMove(e) {
        if (this.isDrag) {
            e.preventDefault();
            var delta = Math.round(performance.now() - this.perfTime);
            var posX = e.clientX || e.targetTouches[0].pageX;
            //console.log(`posx= ${posX}`);
            this.m.movePaddlePos(delta, posX - this.gameAreaShift);
        }
    }
    setSound(e) {
        this.toPlaySounds = this.soundCheck.checked;
        if (this.toPlaySounds && 
            (! this.v.soundInitialized || this.v.sounds['bounce'] == null)) 
        {
            this.v.initSound();
            this.v.soundInitialized = true;
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
        this.m = new GameModel(this.m.width, this.m.height + this.m.footerHeight);
        this.v.m = this.m;
        this.v.newGame();
        this.showControls();
    }
}

class GameApp {
    constructor() {
        if (GameApp.instance) { 
            GameApp.instance.kill();
        }
        GameApp.instance = this;
        // New Game
        const BORDER_WIDTH = 10;
        var width = innerWidth - BORDER_WIDTH * 2;
        var height = innerHeight - BORDER_WIDTH * 2;
        var model = new GameModel(width, height);
        var view = null;
        this.c = null;
        if (model.err) {
            throw new Error('ERROR:' + model.errMsg);
        }
        view = new GameView(model, width, height);
        this.c = new GameController(model, view);
    }
    kill() {
        if (this.c) {
            this.c.kill(); }
        this.c = null;
    }
}

if (typeof(window.newGame) === 'undefined') {
    window.newGame = (ev) => { new GameApp(); }
}

window.addEventListener('load', newGame);
window.addEventListener('resize', newGame);
