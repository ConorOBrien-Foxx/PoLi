import { GameState, HitState } from "./GameState.js";
import { LogicTweener } from "./TweenManager.js";

// this is our game's view (input and output)
export class GameManager {
    constructor(canvas, showMenu) {
        this.canvas = canvas;
        this.canvas.width = 700;
        this.canvas.height = 700;
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false; // for crisp pixels
        this.state = new GameState();
        this.paused = false;
        this.showMenu = showMenu;
        this.fadeOutStart = null;
    }
    
    pause() {
        if(this.paused) return;
        this.paused = true;
        this.state.pause();
    }
    unpause() {
        if(!this.paused) return;
        this.paused = false;
        this.state.unpause();
    }
    
    clear() {
        this.ctx.fillStyle = "#151919";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    step(now, elapsed) {
        if(this.paused) {
            return;
        }
        LogicTweener.step(now, elapsed);
        if(this.state.finished && !this.fadeOutStart) {
            // TODO: store score in local storage?
            this.fadeOutStart = now;
            console.log(this.state.hits, this.state.total);
        }
        if(this.fadeOutStart && now - this.fadeOutStart > 2000) {
            this.fadeOutStart = null;
            this.pause();
            this.showMenu();
        }
        this.state.step(now, elapsed);
        // sm.playQueue();
    }

    // game interface mechanics //
    sendHit(hitStamp) {
        if(this.paused || this.state.finished) return;
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
        this.ctx.strokeStyle = "#fbe9ac";
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(...graph.vertices.at(-1));
        // draw the outline
        for(let [x, y] of graph.vertices) {
            this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        // draw each dot
        graph.vertices.forEach(([x, y], i) => {
            im.drawSprite(this.ctx, "sprites", "node", x, y, 48, 48);
            /*
            this.ctx.fillStyle = "white";
            this.drawCircle(x, y, 20);
            this.ctx.fillStyle = "black";
            this.ctx.font = "25px Arial";
            this.ctx.fillText("#" + i, x - 14, y + 10);
            */
        });
    }
    
    drawFps(fps) {
        // draw fps over it all
        this.ctx.fillStyle = "#dddddd";
        this.ctx.fillRect(0, 0, 150, 50);
        this.ctx.font = "25px Arial";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("FPS: " + fps, 10, 30);
        this.ctx.fillStyle = "white";
    }

    drawAccuracy() {
        
        // this.ctx.fillStyle = "#dddddd";
        // this.ctx.fillRect(0, 0, 150, 50);
        this.ctx.font = "25px 'Press Start 2P'";
        this.ctx.fillStyle = "white";

        let ratio = this.state.total ? this.state.hits / this.state.total : 0;
        let rounded = Math.round(ratio * 10000) / 100;
        let formatted = rounded.toString().padEnd("0", 5);
        let text = formatted + "% " + this.state.hits + "/" + this.state.total;
        this.ctx.textAlign = "right";
        this.ctx.fillText(text, 690, 40);
        this.ctx.textAlign = "left";
    }
    
    static HitStateSprites = {
        [HitState.Perfect]: "perfect",
        [HitState.Great]: "good",
        [HitState.Okay]: "okay",
        [HitState.Miss]: "miss",
    };

    // called once each frame
    draw(now, elapsed) {
        this.clear();
        for(let graph of this.state.graphs) {
            this.drawGraph(graph);
        }
        // draw shadows
        for(let { vertex, judgment, major, born } of this.state.shadows) {
            let spriteName = GameManager.HitStateSprites[judgment];
            // sprite sustain time at full opacity: 500ms
            // fade-out time: 250ms
            // total "animation" time: (sustain + fade-out) = 750ms
            // TODO: parameterize this
            let baseAlpha = Math.min(1, Math.max(0, 1 - (now - born - 500) / 750));
            // console.log(baseAlpha);
            im.drawSprite(this.ctx, "sprites", spriteName, ...vertex, 48, 48, {
                alpha: baseAlpha * (major ? 1 : 0.5),
            });
        }
        // draw each judge
        for(let graph of this.state.graphs) {
            // draw judge
            this.ctx.fillStyle = "blue";
            im.drawSprite(this.ctx, "sprites", "cursor", ...graph.judge.vertex, 32, 32);
        }
        // let fps = Math.round(1000 / elapsed);
        // // let fps = Math.round(100000 / deltaTime) / 100; // higher precision
        // this.drawFps(fps);
        // draw fading
        if(this.fadeOutStart) {
            let alpha = Math.min(1, (now - this.fadeOutStart) / 2000);
            this.ctx.globalAlpha = alpha;
            this.clear();
            this.ctx.globalAlpha = 1.0;
        }
        this.drawAccuracy();
    }
}
