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
        // the polyrhythmic graphs to look at
        this.graphs = [];
        // the timings of the nodes of all the graphs
        this.targets = [];
        // target hit array pattern:
        //    unhit    n/a
        //    miss      >90ms
        //    okay      ±90ms
        //    great     ±60ms
        //    perfect   ±30ms
        this.hitRecord = [];
        // where the player has hit/missed
        this.shadows = [];
        // which timings are owned by which nodes
        this.stepOwners = {};
        // how lenient the timing windows are
        this.difficulty = 5;
        // the lockout (in ms) of when the player can press a key
        this.antiSpam = 50;
        this.lastHit = null;
        // various constants
        this.hitsoundOffset = 0;
    }

    load(json) {
        this.vertexChangeDelay = json.vertexAnimate;
        // this.???? = json.track
        this.graphs = json.graphs.map(data =>
            RegularGraph.fromJSON(data, this.vertexChangeDelay));
        let hitInfo =  this.computeTargetHits()
        this.targets = hitInfo.targets;
        this.totalDuration = hitInfo.duration;
        this.stepOwners = hitInfo.owners;
        this.difficulty = json.difficulty;
        // derived values
        this.hitRecord = this.targets.map(() => HitState.Unhit);
        this.hasPlayed = this.targets.map(() => false);
        /*
         * osu!'s hit window timings:
         * Score   Hit window (ms)
         * 300     80 - 6 * OD
         * 100     140 - 8 * OD
         * 50      200 - 10 * OD
         */
        this.timings = {
            [HitState.Perfect]: 80 - 6 * this.difficulty,
            [HitState.Great]: 140 - 8 * this.difficulty,
            [HitState.Okay]: 200 - 10 * this.difficulty,
            [HitState.Miss]: 300,
            // miss is anything else
        };
        this.lastElapsed = null;
        console.log(this.timings);
    }

    computeTargetHits() {
        // compute the target hits for a single loop
        // TODO:
        let targetHits = [];
        let totalDuration = findLCM(this.graphs.map(graph => graph.loopDuration));
        let stepOwners = {};
        this.graphs.forEach((graph, gdx) => {
            let step = graph.loopDuration / graph.n;
            let hits = [];
            for(let i = 0; i < totalDuration; i += step) {
                hits.push(i);
                stepOwners[i] ??= new Set();
                stepOwners[i].add(gdx);
            }
            targetHits.push(...hits);
        });
        // TODO: we can probably use insertion sort
        targetHits.push(totalDuration);
        stepOwners[totalDuration] = new Set(this.graphs.map((_, i) => i));
        // deduplicate
        targetHits = [...new Set(targetHits)];
        targetHits.sort((a, b) => a - b);
        return { owners: stepOwners, targets: targetHits, duration: totalDuration };
    }

    addShadow(hitStamp, hitJudgment, owners) {
        owners ??= new Set();

        this.graphs.forEach((graph, i) => {
            let interp = graph.interpolateTimeStamp(hitStamp);
            let vertex = graph.interpolateJudgeVertex(interp);
            let major = true;
            if(owners.size && !owners.has(i)) {
                major = false;
            }
            console.log("Major:", major);
            this.shadows.push({ stamp: hitStamp, vertex, judgment: hitJudgment, major });
        });
    }

    sendHit(hitStamp) {
        // TODO: reset loopStart on restart? and/or use mod
        if(!this.loopStart) {
            // do not accept hits if the game is not running
            return;
        }
        if(this.lastHit && hitStamp - this.lastHit <= this.antiSpam) {
            // antimash: do not accept hits too close to the last one
            return;
        }
        this.lastHit = hitStamp;

        // judge the player's input
        let hitMarker = (hitStamp - this.loopStart) % this.totalDuration;
        let isHit = false;
        let hitJudgment, hitTiming;
        this.targets.forEach((timing, i) => {
            if(isHit) {
                return;
            }
            let absDifference = Math.abs(timing - hitMarker);
            let judgment = this.hitRecord[i];
            let isEarly = hitMarker < timing;
            // TODO: late/early judgment?
            // TODO: make more readable/less redundant
            if(absDifference < this.timings[HitState.Perfect]) {
                judgment = hitJudgment = HitState.Perfect;
                hitTiming = timing;
                isHit = true;
            }
            else if(absDifference < this.timings[HitState.Great]) {
                judgment = hitJudgment = HitState.Great;
                hitTiming = timing;
                isHit = true;
            }
            else if(absDifference < this.timings[HitState.Okay]) {
                judgment = hitJudgment = HitState.Okay;
                hitTiming = timing;
                isHit = true;
            }
            else if(isEarly && absDifference < this.timings[HitState.Miss]) {
                judgment = HitState.Miss;
            }
            this.hitRecord[i] = judgment;
        });
        if(isHit) {
            // sm.queue("hit");
            sm.play("hit");
        }
        else {
            // sm.queue("miss");
            sm.play("miss");
            hitJudgment = HitState.Miss;
        }
        this.addShadow(hitStamp, hitJudgment, this.stepOwners[hitTiming]);
    }
    
    pause() {
        // when we pause, we want to set our variables to be right for unpause
        if(!this.loopStart) {
            return;
        }
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
        if(this.loopStart) {
            return;
        }
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
        this.shadows = [];
    }
    
    resetHitRecord() {
        // copy over the last elements to the first (for wrapping around)
        let lastHitRecord = this.targets.at(-1);
        let lastHasPlayed = this.hasPlayed.at(-1);
        this.hitRecord = this.targets.map(() => HitState.Unhit);
        this.hitRecord[0] = lastHitRecord;
        this.hasPlayed = this.targets.map(() => false);
        this.hasPlayed[0] = lastHasPlayed;
    }

    step(now, elapsed) {
        if(!this.loopStart) {
            return;
        }
        for(let graph of this.graphs) {
            graph.step(now, elapsed);
        }
        // determine if we're resetting a loop
        let elapsedSinceStart = (now - this.loopStart) % this.totalDuration;
        if(this.lastElapsed > elapsedSinceStart) {
            this.resetHitRecord();
        }
        // determine if a note too late to hit
        this.lastElapsed = elapsedSinceStart;
        this.targets.forEach((timing, i) => {
            if(this.hitRecord[i] === HitState.Unhit) {
                if(elapsedSinceStart > timing + this.timings[HitState.Okay]) {
                    //console.log(elapsedSinceStart, timing, this.timings[HitState.Okay]);
                    // this.addShadow(now, HitState.Miss);
                    this.hitRecord[i] = HitState.Miss;
                    sm.play("miss");
                }
            }
            if(!this.hasPlayed[i]) {
                if(timing + this.hitsoundOffset < elapsedSinceStart) {
                    let owners = this.stepOwners[timing];
                    for(let ownerIndex of owners) {
                        sm.play(this.graphs[ownerIndex].hitsound);
                    }
                    this.hasPlayed[i] = true;
                }
            }
        });
        // TODO: fade
        this.shadows = this.shadows.filter(shadow => now - shadow.stamp < 1000);
    }
}
