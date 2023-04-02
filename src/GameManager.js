import { GameState, HitState } from "./GameState.js";
import { LogicTweener } from "./TweenManager.js";

// this is our game's view (input and output)
export class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.canvas.width = 700;
        this.canvas.height = 700;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false; // for crisp pixels
        this.state = new GameState();
        this.paused = false;
    }
    
    pause() {
        this.paused = true;
        this.state.pause();
    }
    unpause() {
        this.paused = false;
        this.state.unpause();
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    step(now, elapsed) {
        if(this.paused) {
            return;
        }
        LogicTweener.step(now, elapsed);
        this.state.step(now, elapsed);
        sm.playQueue();
    }

    // game interface mechanics //
    sendHit(hitStamp) {
        this.state.sendHit(hitStamp);
    }
    
    // helper methods //
    addVertex(...args) { this.state.addVertex(...args); }
    removeVertex(...args) { this.state.removeVertex(...args); }
    setVertexCount(...args) { this.state.setVertexCount(...args); }
    
    drawCircle(x, y, r) {
        // TODO: dot information?
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2, true);
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
    }
    
    drawFps(fps) {
        // draw fps over it all
        this.ctx.fillStyle = "#dddddd";
        this.ctx.fillRect(0, 0, 150, 50);
        this.ctx.font = "25px Arial";
        this.ctx.fillStyle = "black";
        let [ h1, h2 ] = this.state.graphs.map(e => e.hitZero);
        let diff = h2 - h1;
        this.ctx.fillText("FPS: " + fps, 10, 30);
        this.ctx.fillStyle = "white";
    }
    
    static HitStateColors = {
        [HitState.Perfect]: "blue",
        [HitState.Great]: "orange",
        [HitState.Okay]: "yellow",
        [HitState.Miss]: "red",
    };

    // called once each frame
    draw(now, elapsed) {
        let fps = Math.round(1000 / elapsed);
        // let fps = Math.round(100000 / deltaTime) / 100; // higher precision
        this.clear();
        for(let graph of this.state.graphs) {
            this.drawGraph(graph);
        }
        // draw shadows
        for(let { vertex, judgment } of this.state.shadows) {
            this.ctx.fillStyle = GameManager.HitStateColors[judgment];
            this.drawCircle(...vertex, 18);
        }
        // draw each judge
        for(let graph of this.state.graphs) {
            // draw judge
            this.ctx.fillStyle = "blue";
            // this.drawCircle(...graph.judge.vertex, 15);
            im.drawSprite(this.ctx, "sprites", "cursor", ...graph.judge.vertex, 32, 32, {
                centered: true
            });
        }
        this.drawFps(fps);
    }
}
