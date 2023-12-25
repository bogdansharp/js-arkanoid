class GameModel {
    constructor(width, height) {
        const MIN_WIDTH = 128;
        const MIN_HEIGHT = 64;
        this.state = 0; // INITIALIZATION
        this.time = 0;
        this.err = 0; // OK
        this.errMsg = ''; // OK
        this.score = 0;
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
        this.angle = Math.PI / 3.0;
        this.ballRadius = 8;
        this.ballDiam = this.ballRadius * 2;
        this.ballX = this.width / 2;
        this.ballY = this.height - this.ballRadius;
        this.moveBall(0);
        //
        this.hp = [];
        this.hp.push({y: 0, x1: 0, x2: this.width, type: 1});
        this.hp.push({y: this.height, x1: 0, x2: this.width, type: 2});
        this.vp = [];
        this.vp.push({y1: 0, y2: this.height + this.footerHeight, x: 0, type: 1});
        this.vp.push({y1: 0, y2: this.height + this.footerHeight, x: this.width, type: 1});
        this.eq = [];
        this.eq.push({type: 3, time: this.time}); // horizontal bounce
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
    queueBounce() {
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
            console.log(`hp[${i}] dtime=${dtime} X=${this.ballX} nextX=${nextX.toFixed(4)}`);
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
            console.log(`vp[${i}] dtime=${dtime} Y=${this.ballY} nextY=${nextY.toFixed(4)}`);
            if (nextY > segment.y2 || nextY < segment.y1)
                continue;
            if (dtime < minVTime) {
                minVIdx = i;
                minVTime = dtime;
            }
        }
        console.log(`bounce time = ${this.time} angle=${this.angle.toFixed(4)} minVTime=${minVTime.toFixed(4)} minHTime=${minHTime.toFixed(4)}`);
        if (minHTime == Infinity && minVTime == Infinity)
            return;
        if (minHTime < minVTime) {
            let eventType = this.hp[minHIdx].type == 2 ? 5 : 3; 
            this.eq.push({type: eventType, time: this.time + minHTime}); // horizontal bounce
        } else {
            this.eq.push({type: 4, time: this.time + minVTime}); // vertical bounce
        }
    }
    processEvent(ev) {
        console.log(ev)
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
            case 3: // horizontal bounce
            case 5: // horizontal paddle bounce
            case 4: // vertical bounce
                this.moveBall(ev.time - this.time)
                if (ev.type == 3) { // horizontal bounce
                    this.angle = - this.angle;
                } else if (ev.type == 5) { // horizontal paddle bounce
                    if (this.ballX <= this.paddleRight && this.ballX >= this.paddleLeft) {
                        this.angle = - this.angle;
                    } else {
                        // game over
                        var sina = Math.sin(this.angle);
                        var vspeed = this.speed * sina;
                        this.eq.push({type: 6, time: this.time + this.footerHeight / vspeed});
                    }
                } else if (ev.type == 4) { // vertical bounce 
                    this.angle = Math.PI - this.angle;
                }
                this.queueBounce();
                break;
            case 6:
                this.state = 2; // GAME LOST
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
        this.status.innerHTML = "Level 1";
        this.status.classList.remove('msg-err');
        this.status.classList.add('msg-ok');
        // ball
        this.ball = document.getElementById("ball");
        this.ball.style.width = `${this.m.ballDiam}px`;
        this.ball.style.height = `${this.m.ballDiam}px`;
        this.ball.style.borderRadius = `${this.m.ballRadius}px`;
        this.drawBall();
        // paddle
        this.paddle = document.getElementById("paddle");
        this.paddle.style.width = `${this.m.paddleWidth}px`;
        this.paddle.style.height = `${this.m.paddleHeight}px`;
        this.paddle.style.top = `${this.m.paddleTop}px`;
        this.drawPaddle();
        
    }
    drawPaddle() {
        this.paddle.style.left = `${Math.round(this.m.paddleLeft)}px`;
    }
    drawBall() {
        this.ball.style.top = `${Math.round(this.m.ballTop)}px`;
        this.ball.style.left = `${Math.round(this.m.ballLeft)}px`;
    }
    endGame() {
        this.drawBall();
        this.drawPaddle();
        this.ball.style.visibility = 'hidden';
        this.status.innerHTML = "Game Over";
        this.status.classList.remove('msg-ok');
        this.status.classList.add('msg-err');
    }
}

class GameController {
    constructor(model, view) {
        // Model, View
        this.m = model;
        this.v = view;
        // Key handlers
        this.keyListener = this.keyListener.bind(this);
        document.addEventListener('keydown', this.keyListener, false);
        // Game steps
        this.step = this.step.bind(this);
        this.timer = 0;
        this.perfTime = performance.now();
        this.timer = requestAnimationFrame(this.step);
    }
    step() {
        if (this.m.state == 2) { // Game over
            if (this.timer) {
                window.cancelAnimationFrame(this.timer); }
            this.v.endGame();
            return;
        }
        var newTime = performance.now();
        this.m.timeStep(newTime - this.perfTime);
        this.perfTime = newTime;
        this.v.drawPaddle();
        this.v.drawBall();
        this.timer = requestAnimationFrame(this.step);
    }
    keyListener(e) {
        var key = e.keyCode;
        var delta = Math.round(performance.now() - this.perfTime);
        //console.log(`keyDown delta=${delta}`);
        if (key == 37 || key == 65) {
            this.m.movePaddleLeft(delta);
        } else if (key == 39 || key == 68) {
            this.m.movePaddleRight(delta);
        }
    }
    kill() {
        document.removeEventListener('keydown', this.keyListener, false);
        if (this.timer) {
            window.cancelAnimationFrame(this.timer); }
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
        this.m = new GameModel(width, height);
        this.v = null;
        this.c = null;
        if (this.m.err) {
            throw new Error('ERROR:' + this.m.errMsg);
        }
        this.v = new GameView(this.m, width, height);
        this.c = new GameController(this.m, this.v);
    }
    kill() {
        if (this.c) {
            this.c.kill(); }
        this.c = null;
        this.v = null;
        this.m = null;
    }
}

if (typeof(window.newGame) === 'undefined') {
    window.newGame = (ev) => { new GameApp(); }
}

window.addEventListener('load', newGame);
window.addEventListener('resize', newGame);
