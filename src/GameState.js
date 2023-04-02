import { RegularGraph } from "./RegularGraph.js";

export const findLCM = arr => {
    let max = Math.max(...arr);
    let lcm = max;
    while(true) {
        let isFound = true;
        for(let n of arr) {
            if(lcm % n !== 0) {
                isFound = false;
                break;
            }
        }
        if(isFound) {
            return lcm;
        }
        lcm += max;
    }
};

export const HitState = {
    Unhit:      Symbol("HitState.Unhit"),
    Miss:       Symbol("HitState.Miss"),
    Okay:       Symbol("HitState.Okay"),
    Great:      Symbol("HitState.Great"),
    Perfect:    Symbol("HitState.Perfect"),
};

export class GameState {
    constructor(vertexChangeDelay = 300) {
        this.vertexChangeDelay = vertexChangeDelay;
        this.graphs = [];
        this.targets = [];
        // target hit array pattern:
        //    unhit    n/a
        //    miss      >90ms
        //    okay      ±90ms
        //    great     ±60ms
        //    perfect   ±30ms
        this.targetHits = [];
        this.shadows = [];
    }

    load(json) {
        this.vertexChangeDelay = json.vertexAnimate;
        // this.???? = json.track
        this.graphs = json.graphs.map(data =>
            RegularGraph.fromJSON(data, this.vertexChangeDelay));
        this.targets = this.computeTargetHits();
        this.targetHits = this.targets.map(() => HitState.Unhit);
    }

    computeTargetHits() {
        // compute the target hits for a single loop
        // TODO:
        let targetHits = [];
        let totalDuration = findLCM(this.graphs.map(graph => graph.loopDuration));
        for(let graph of this.graphs) {
            let step = graph.loopDuration / graph.n;
            let hits = [];
            for(let i = 0; i < totalDuration; i += step) {
                hits.push(i);
            }
            console.log(graph.n, hits);
            targetHits.push(...hits);
        }
        // TODO: we can probably use insertion sort
        // deduplicate
        targetHits = [...new Set(targetHits)];
        targetHits.sort((a, b) => a - b);
        return targetHits;
    }

    sendHit(hitStamp) {
        let marker = hitStamp - this.loopStart;
        sm.play("hit");
        for(let graph of this.graphs) {
            let interp = graph.interpolateTimeStamp(hitStamp);
            let vertex = graph.interpolateJudgeVertex(interp);
            this.shadows.push(vertex);
        }
    }
    
    pause() {
        // when we pause, we want to set our variables to be right for unpause
        this.savedElapsed = Date.now() - this.loopStart;
        for(let graph of this.graphs) {
            graph.pause(this.savedElapsed);
        }
    }

    unpause() {
        if(this.loopStart) {
            this.loopStart = Date.now() - this.savedElapsed;
        }
        this.savedElapsed = null;
        for(let graph of this.graphs) {
            graph.unpause(this.loopStart);
        }
    }

    addVertex(...args) {
        this.graphs[0].addVertex(...args);
    }

    removeVertex(...args) {
        this.graphs[0].removeVertex(...args);
    }

    setVertexCount(...args) {
        this.graphs[0].setVertexCount(...args);
    }
    
    countdown(n, rate=500) {
        return new Promise((resolve, reject) => {
            let step = n => {
                if(n > 0) {
                    sm.play("count");
                    setTimeout(() => step(n - 1), rate);
                }
                else {
                    resolve();
                }
            };
            step(n);
        });
    }

    startJudges() {
        this.countdown(3).then(() => {
            console.log("starting!");
            this.loopStart = Date.now();
            for(let graph of this.graphs) {
                graph.startJudge(this.loopStart);
            }
        });
    }

    stopJudges() {
        this.loopStart = null;
        for(let graph of this.graphs) {
            graph.stopJudge();
        }
    }
    
    step(now, elapsed) {
        for(let graph of this.graphs) {
            graph.step(now, elapsed);
        }
    }
}
