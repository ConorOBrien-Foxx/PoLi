import { LogicTweener, FrameTweener } from "./TweenManager.js";

export class RegularGraph {
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
        this.setVertices();
        // temporary: get sounds to play
        this.lastBehind = null;
    }
    
    static polygonalVertices = (xc, yc, r, sides) => {
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
    
    setVertexCount(to) {
        this.nextN = to;
        this.snapVertex();
    }

    startJudge(at) {
        // TODO: abstract sound manager out into different class?
        // maybe emit custom events for abstraction
        this.loopStart = Date.now();
    }

    interpolateJudge(interp) {
        // 0 <= interp < this.n
        let behindIndex = Math.floor(interp);
        this.behindIndex = behindIndex; // temporary: get sounds to play
        let forwardIndex = this.getNextVertexPosition(behindIndex);
        let behind = this.vertices[behindIndex];
        let forward = this.vertices[forwardIndex];
        let progress = interp % 1;
        return [
            behind[0] + (forward[0] - behind[0]) * progress,
            behind[1] + (forward[1] - behind[1]) * progress,
        ];
    }

    updateJudge(now) {
        if(!this.loopStart) {
            return;
        }
        let oldBehind = this.behindIndex;
        let elapsedSinceStart = now - this.loopStart; //ms
        let interp = (elapsedSinceStart * this.n / this.loopDuration) % this.n;
        this.judge.vertex = this.interpolateJudge(interp);
        // temporary: get sounds to play
        if(oldBehind !== this.behindIndex) {
            window.sm.play(this.hitsound);
        }
    }
    
    stopJudge() {
        // TODO:
        // LogicTweener.removeTween(this.judge, "position");
        // FrameTweener.removeAllTweensFor(this.judge.vertex);
    }
    
    step(now, elapsed) {
        this.n = this.nextN;
        this.setVertices();
        this.updateJudge(now);
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
        let targetVertices = RegularGraph.polygonalVertices(this.xc, this.yc, this.r, subN);
        this.vertices.forEach((vertex, i) => {
            let target = targetVertices[i];
            FrameTweener.addTween(vertex, target, this.vertexChangeDelay);
        });
    }
    
    setVertices() {
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
                this.vertices = RegularGraph.polygonalVertices(this.xc, this.yc, this.r, this.n);
            }
        }
    }
}
