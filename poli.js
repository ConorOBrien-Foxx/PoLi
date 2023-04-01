class SoundManager {
    constructor() {
        this.sounds = {};
        this.loading = new Set();
        this.resolution = new Set();
        this.checkingReady = false;
    }
    
    add(name, src, count) {
        this.sounds[name] = [];
        for(let i = 0; i < count; i++) {
            let sound = new Audio(src);
            let key = `${name}...${i}`;
            this.loading.add(key);
            let onPlay = () => {
                // canplaythrough will trigger every time the sound is able to be played
                // we don't care when it's able to be-replayed, only when its loaded
                // so we only want to trigger this once
                sound.removeEventListener("canplaythrough", onPlay);
                this.sounds[name].push(sound);
                this.loading.delete(key);
                this.checkReady();
            };
            sound.addEventListener("canplaythrough", onPlay);
        }
    }
    
    // TODO: is this proper mutex??
    checkReady() {
        if(this.checkingReady) return;
        this.checkingReady = true;
        if(this.loading.size === 0) {
            for(let reso of this.resolution) {
                reso();
            }
        }
        this.checkingReady = false;
    }
    
    play(name) {
        if(!this.sounds[name]) {
            throw new Error(`Could not find sound with name '${name}'`);
        }
        // console.log(this.sounds[name].filter(s=>!s.paused).length);
        this.sounds[name].find(sound => sound.paused)?.play();
    }
    
    ready() {
        return new Promise((resolve, reject) => {
            if(this.loading.length === 0) {
                resolve();
            }
            else {
                this.resolution.add(resolve);
            }
        });
    }
    
}

const polygonalVertices = (xc, yc, r, sides) => {
    let theta = sides % 2 == 0
        ? Math.PI/sides
        : 2*Math.PI/sides;
    theta += Math.PI;
    
    let vertices = [];
    
    for(let n = 0; n < sides; n++) {
        let x = r * Math.sin(2 * Math.PI * n / sides + theta) + xc;
        let y = r * Math.cos(2 * Math.PI * n / sides + theta) + yc;
        vertices.push([ x, y ]);
    }
    
    return vertices;
};

// TODO: RenderManager

class TweenManager {
    static RejectReason = {
        Kill: Symbol("TweenManager.RejectReason.Kill"),
        Error: Symbol("TweenManager.RejectReason.Error"),
    };
    
    constructor() {
        this.tweens = [];
    }
    
    addTween(source, target, duration/*, { update = null }*/) {
        let onKeys = Object.keys(target);
        // override existing tweens for key
        this.tweens = this.tweens.filter(tween =>
            source !== tween.source ||
            !onKeys.includes(tween.key)
        );
        let promises = onKeys.map(key => {
            let start = source[key];
            let end = target[key];
            let step = (end - start) / duration;
            // TODO: allow fixed step size
            return new Promise((resolve, reject) => {
                this.tweens.push({
                    source, key, start, end, step,
                    // update,
                    resolve, reject,
                });
            });
        });
        return Promise.all(promises);
    }
    
    removeAllTweensFor(source) {
        this.tweens = this.tweens.filter(tween => {
            if(tween.source === source) {
                tween.reject(TweenManager.RejectReason.Kill);
                return false;
            }
            else {
                return true;
            }
        });
    }
    
    removeTween(source, target) {
        let onKeys = Object.keys(target);
        this.tweens = this.tweens.filter(tween => {
            if(tween.source === source && onKeys.includes(tween.key)) {
                tween.reject(TweenManager.RejectReason.Kill);
                return false;
            }
            else {
                return true;
            }
        });
    }
    
    step(deltaTime) {
        // console.log(deltaTime);
        this.tweens = this.tweens.map(tween => {
            let { source, key, start, end, step, resolve } = tween;
            source[key] += step * deltaTime;
            const isAtEnd = Math.sign(source[key] - end) == Math.sign(step);
            if(isAtEnd) {
                source[key] = end;
                resolve({ source, key, end });
                return null;
            }
            else {
                return tween;
            }
        }).filter(tween => tween);
    }
}

const FrameTweener = new TweenManager();
const LogicTweener = new TweenManager();

class RegularGraph {
    constructor({ n, xc, yc, r, vertexChangeDelay, hitsound }) {
        this.n = this.nextN = n;
        this.xc = xc;
        this.yc = yc;
        this.r = r;
        this.vertexChangeDelay = vertexChangeDelay;
        this.hitsound = hitsound;
        this.loopDuration = 3000;
        // vertices of the main graph
        this.vertices = [];
        // the judgment line/dot
        this.judge = {
            vertex: [],//x,y
            speed: this.loopDuration / this.n,//ms
            position: 0,//index in vertices
        };
        // initialize start values
        this.poly();
    }
    
    
    // make sure the vertex is in a valid bounds
    snapVertex() {
        if(this.nextN < 2 || !Number.isInteger(this.nextN)) {
            this.nextN = 2;
        }
    }
    
    getNextVertexPosition(index) {
        return index + 1 === this.vertices.length
            ? 0
            : index + 1;
    }
    
    /** state modification methods **/
    addVertex(count = 1) {
        this.nextN += count;
        this.snapVertex();
    }
    
    removeVertex(count = 1) {
        this.nextN -= count;
        this.snapVertex();
    }
    
    setVertex(to) {
        this.nextN = to;
        this.snapVertex();
    }
    
    startJudge(at) {
        // TODO: abstract sound manager out into different class?
        // maybe emit custom events for abstraction
        sm.play(this.hitsound);
        if(at === 0) {
            this.hitZero = +new Date();
        }
        this.judge.position = at;
        this.judge.vertex = [...this.vertices[at]];
        let nextPosition = this.getNextVertexPosition(at);
        // TODO: allow the judge to be stopped?
        // does this already happen?
        FrameTweener.addTween(
            this.judge.vertex,
            this.vertices[nextPosition],
            this.judge.speed,
        ).catch(reason => {
            // pass: we've been terminated
            if(reason !== TweenManager.RejectReason.Kill) {
                console.error(reason);
            }
        });
        LogicTweener.addTween(
            this.judge,
            { position: nextPosition },
            this.judge.speed
        ).then(() => {
            this.startJudge(nextPosition);
        }).catch(reason => {
            // we've been terminated
            // TODO: cleanup?
            if(reason !== TweenManager.RejectReason.Kill) {
                console.error(reason);
            }
        });
    }
    
    stopJudge() {
        LogicTweener.removeTween(this.judge, "position");
        FrameTweener.removeAllTweensFor(this.judge.vertex);
    }
    
    step(deltaTime) {
        this.n = this.nextN;
        this.poly();
    }
    
    /** helper methods **/
    stepVertex(targetN) {
        // TODO: update the judge
        let stepDelta;
        let initialLength = this.vertices.length;
        if(initialLength > targetN) {
            stepDelta = -1;
            // this prevents the object from rotating from one step to the other
            if(initialLength % 2 === 0) {
                this.vertices.shift();
            }
            else {
                this.vertices.pop();
            }
        }
        else {
            stepDelta = 1;
            let [ x1, y1 ] = this.vertices.at(0);
            let [ x2, y2 ] = this.vertices.at(-1);
            
            let midpoint = [(x1 + x2) / 2, (y1 + y2) / 2];
            
            // this prevents the object from rotating from one step to the other
            if(this.vertices.length % 2 === 0) {
                this.vertices.push(midpoint);                        
            }
            else {
                this.vertices.unshift(midpoint);
            }
        }
        let subN = initialLength + stepDelta;
        let targetVertices = polygonalVertices(this.xc, this.yc, this.r, subN);
        this.vertices.forEach((vertex, i) => {
            let target = targetVertices[i];
            FrameTweener.addTween(vertex, target, this.vertexChangeDelay);
        });
    }
    
    poly() {
        // tweening: even-to-odd, map to same index
        // odd-toeven, map to next index
        if(this.n !== this.vertices.length) {
            // TODO: tween between more than one step
            // descend down the chain?
            // TODO: tween and detect tween
            if(this.vertices.length !== 0) {
                while(this.vertices.length !== this.n) {
                    // TODO: surely there is a more mathy way to compute
                    // destination vertices
                    // will always add/remove at every step
                    this.stepVertex(this.n);
                }
            }
            else {
                this.vertices = polygonalVertices(this.xc, this.yc, this.r, this.n);
            }
        }
    }
}

class GameState {
    constructor(vertexChangeDelay = 300) {
        // TODO: abstract into graph type to support multiple graphs
        this.vertexChangeDelay = vertexChangeDelay;
        this.graphs = [
            new RegularGraph({
                vertexChangeDelay,
                xc: 200,
                yc: 300,
                r: 125,
                n: 3,
                hitsound: "hit2",
            }),
            new RegularGraph({
                vertexChangeDelay,
                xc: 500,
                yc: 300,
                r: 125,
                n: 4,
                hitsound: "hit1",
            }),
        ];
    }
    
    addVertex(...args) {
        this.graphs[0].addVertex(...args);
    }
    removeVertex(...args) {
        this.graphs[0].removeVertex(...args);
    }
    setVertex(...args) {
        this.graphs[0].setVertex(...args);
    }
    
    step(deltaTime) {
        for(let graph of this.graphs) {
            graph.step(deltaTime);
        }
    }
}

// this is our game's view (input and output)
class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.canvas.width = 700;
        this.canvas.height = 700;
        this.ctx = this.canvas.getContext("2d");
        this.state = new GameState();
        this.paused = false;
    }
    
    pause() { this.paused = true; }
    unpause() { this.paused = false; }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    step(deltaTime) {
        if(this.paused) return;
        LogicTweener.step(deltaTime);
        this.state.step(deltaTime);
    }
    
    addVertex(...args) { this.state.addVertex(...args); }
    removeVertex(...args) { this.state.removeVertex(...args); }
    setVertex(...args) { this.state.setVertex(...args); }
    
    drawCircle(x, y, r) {
        // TODO: dot information?
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2, true);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawGraph(graph) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "black";
        this.ctx.moveTo(...graph.vertices.at(-1));
        // draw the outline
        for(let [x, y] of graph.vertices) {
            this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        // draw each dot
        graph.vertices.forEach(([x, y], i) => {
            this.ctx.fillStyle = "white";
            this.drawCircle(x, y, 20);
            this.ctx.fillStyle = "black";
            this.ctx.font = "25px Arial";
            this.ctx.fillText("#" + i, x - 14, y + 10);
        });
        // draw judge
        this.ctx.fillStyle = "red";
        this.drawCircle(...graph.judge.vertex, 15);
    }
    
    drawFps(fps) {
        // draw fps over it all
        this.ctx.fillStyle = "#dddddd";
        this.ctx.fillRect(0, 0, 270, 50);
        this.ctx.font = "25px Arial";
        this.ctx.fillStyle = "black";
        let [ h1, h2 ] = this.state.graphs.map(e => e.hitZero);
        let diff = h2 - h1;
        this.ctx.fillText("FPS: " + fps
            + " | diff: " + diff + "ms", 10, 30);
            // + " | N: " + this.state.graphs[0].n, 10, 30);
        this.ctx.fillStyle = "white";
    }
    
    // called once each frame
    draw(deltaTime) {
        let fps = Math.round(1000 / deltaTime);
        // let fps = Math.round(100000 / deltaTime) / 100;
        this.clear();
        for(let graph of this.state.graphs) {
            this.drawGraph(graph);
        }
        this.drawFps(fps);
    }
}

let sm = new SoundManager();
// sm.add("hit", "./hit.wav", 3);
sm.add("hit1", "./ting.wav", 3);
sm.add("hit2", "./tut.wav", 3);
sm.add("miss", "./miss.wav", 1);
sm.ready().then(() => {
    // sm.play("hit");
});

window.addEventListener("load", function() {
    let gm = new GameManager(document.getElementById("game"));
    window.gm=gm;//debugging
    
    // gm.draw(n);
    let deltaTime, oldTimeStamp, fps;
    let nextUpdate;
    const updatesPerSecond = 25;
    const skipTicks = 1000 / updatesPerSecond;
    console.log(updatesPerSecond, skipTicks);
    
    // let fpsInterval = 1000 / 60; // 60fps
    
    // let then, startTime;
    // let elapsed, now;
    
    const gameLoop = timeStamp => {
        // console.log(timeStamp, "vs", Date.now());
        window.requestAnimationFrame(gameLoop);
        
        /*
        
        now = Date.now();
        elapsed = now - then;
        
        if(elapsed > fpsInterval) {
            then = now - (elapsed % fpsInterval);
            // console.log(elapsed);
            
            FrameTweener.step(elapsed);
            gm.step(elapsed);
            gm.draw(elapsed);
            
        }
        */
        // /*
        
        if(!oldTimeStamp) {
            oldTimeStamp = nextUpdate = timeStamp;
            window.requestAnimationFrame(gameLoop);
            return;
        }
        deltaTime = timeStamp - oldTimeStamp;
        oldTimeStamp = timeStamp;
        // step our logic
        while(nextUpdate < timeStamp) {
            gm.step(skipTicks);
            nextUpdate += skipTicks;
        }
        // step our renderer
        if(!gm.paused) {
            FrameTweener.step(deltaTime);
        }
        // draw
        gm.draw(deltaTime);//deltaTime given for display
        // */
    };
    
    window.requestAnimationFrame(gameLoop);
    // then = Date.now();
    // startTime = then;
    // gameLoop();

    window.addEventListener("focus", function() {
        gm.unpause();
    });
    window.addEventListener("blur", function() {
        gm.pause();
    });
    
    document.addEventListener("keydown", (ev) => {
        if(ev.key === "s") {
            gm.removeVertex();
        }
        else if(ev.key === "w") {
            gm.addVertex();
        }
        else if(ev.key === "d") {
            gm.removeVertex(2);
        }
        else if(ev.key === "e") {
            gm.addVertex(2);
        }
        else if("0" <= ev.key && ev.key <= "9") {
            gm.setVertex(parseInt(ev.key, 10));
        }
        else if(ev.key === "p") {
            // temporary
            for(let graph of gm.state.graphs) {
                graph.startJudge(0);
            }
        }
        else if(ev.key === "o") {
            for(let graph of gm.state.graphs) {
                graph.stopJudge();
            }
        }
        // sm.play("hit");
    });
});