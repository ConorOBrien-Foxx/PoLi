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
        // the individual timings of each graph
        this.graphTargets = [];
        this.hitRecord = [];
        // where the player has hit/missed
        this.shadows = [];
        // which timings are owned by which nodes
        this.stepOwners = {};
        // how lenient the timing windows are
        this.difficulty = 5;
        // the lockout (in ms) of when the player can press a key
        this.antiSpam = 150;
        this.lastHit = null;
        // which events (if any) are present (sorted)
        this.events = [];
        //* various constants *//
        // internal note offset
        // TODO: figure out if actually corresponds to typical sense of "offset"
        this.hitSoundOffset = 0;
        // state
        this.stopped = true;
        this.paused = false;
        this.finished = false;
        // this.loopCount = -1; //-1 because we start before
        this.hits = 0;
        this.total = 0;
        this.totalNotesPlayed = 0;
    }

    load(json) {
        this.vertexChangeDelay = json.vertexAnimate;
        // this.???? = json.track
        this.events = json.events;
        this.difficulty = json.difficulty;
        this.graphs = json.graphs.map(data =>
            RegularGraph.fromJSON(data, this.vertexChangeDelay));
        this.applyComputeTargetHits();
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
            // miss is anything else; this is used for late penatly
            [HitState.Miss]: 300,
        };
        this.lastElapsed = null;
    }

    computeTargetHits() {
        const BEFORE_AFTER_PADDING = 1000;//ms
        let stepOwners = {};
        let hitTargets = [];
        let duration = null;
        let graphTargets = [];

        this.graphs.forEach((graph, gdx) => {
            // obtain hit segments
            let newSideChanges = this.events
                .filter(event => event?.condition?.totalNotesPlayed)
                .map(event => ({
                    newSides: event.effects[gdx]?.newSides,
                    totalNotesPlayed: event.condition.totalNotesPlayed,
                }))
                .filter(({ newSides }) => newSides);
            
            let sideRuns = [
                graph.n,
                ...newSideChanges.map(({ newSides }) => newSides)
            ].map((sides, i) => {
                let lastIndex = newSideChanges[i - 1]?.totalNotesPlayed ?? 0;
                let currentIndex = newSideChanges[i]?.totalNotesPlayed ?? graph.hitNotes.length;
                let count = currentIndex - lastIndex;
                // TODO: is graph.loopDuration the correct numerator?
                let step = graph.loopDuration / sides;
                return { sides, step, count };
            });
            console.log(sideRuns);
            // TODO: floating point error, somehow?
            
            // to start our counting at 1
            // this seems like a hack
            let lastTimeStamp = -sideRuns[0].step;
            let hits = [];
            for(let { sides, step, count } of sideRuns) {
                for(let i = 1; i <= count; i++) {
                    let stamp = lastTimeStamp + step * i;
                    hits.push(stamp);
                }
                lastTimeStamp = hits.at(-1);
            }

            for(let hit of hits) {
                stepOwners[hit] ??= new Set();
                stepOwners[hit].add(gdx);
            }
            hitTargets.push(...hits);
            graphTargets.push(hits);
            duration = Math.max(...hits) + BEFORE_AFTER_PADDING;
            console.log(hitTargets);
        });

        // TODO: we can probably use insertion sort
        // hitTargets.push(totalDuration);
        // stepOwners[totalDuration] = new Set(this.graphs.map((_, i) => i));
        // deduplicate
        hitTargets = [...new Set(hitTargets)];
        hitTargets.sort((a, b) => a - b);

        return {
            owners: stepOwners,
            targets: hitTargets,
            duration: duration,
            graphTargets: graphTargets,
        };
    }

    applyComputeTargetHits() {
        let hitInfo = this.computeTargetHits();
        this.targets = hitInfo.targets;
        this.totalDuration = hitInfo.duration;
        this.stepOwners = hitInfo.owners;
        this.graphTargets = hitInfo.graphTargets;
        // derived values
        this.hitRecord = this.targets.map(() => HitState.Unhit);
        this.hasPlayed = this.targets.map(() => false);
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
            this.shadows.push({
                vertex, major,
                stamp: hitStamp,
                judgment: hitJudgment,
                born: Date.now(), 
            });
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
        let isMiss = false;
        let ignore = false;
        let hitJudgment, hitTiming;
        this.targets.forEach((timing, i) => {
            if(isHit || isMiss || ignore) {
                // TODO: break?
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
                // console.log("perfect for vertex", i);
            }
            else if(absDifference < this.timings[HitState.Great]) {
                judgment = hitJudgment = HitState.Great;
                hitTiming = timing;
                isHit = true;
                // console.log("great for vertex", i);
            }
            else if(absDifference < this.timings[HitState.Okay]) {
                judgment = hitJudgment = HitState.Okay;
                hitTiming = timing;
                isHit = true;
                // console.log("okay for vertex", i);
            }
            else if(isEarly && absDifference < this.timings[HitState.Miss]) {
                judgment = hitJudgment = HitState.Miss;
                isMiss = true;
            }
            if(isHit && judgment !== this.hitRecord[i] && this.hitRecord[i] !== HitState.Unhit) {
                // if we would write to a non-unhit judgment, just ignore it
                ignore = true;
            }
            else {
                this.hitRecord[i] = judgment;
            }
        });
        if(ignore) return;
        if(isHit) {
            sm.play("hit");
            switch(hitJudgment) {
                case HitState.Perfect:  this.hits += 3; break;
                case HitState.Great:    this.hits += 2; break;
                case HitState.Okay:     this.hits += 1; break;
            }
            this.total += 3;
        }
        else if(isMiss) {
            sm.play("miss");
            this.total += 3;
        }
        if(hitJudgment && hitJudgment !== HitState.Unhit) {
            this.addShadow(hitStamp, hitJudgment, this.stepOwners[hitTiming]);
        }
    }
    
    pause() {
        // when we pause, we want to set our variables to be right for unpause
        if(!this.loopStart || this.paused) {
            return;
        }
        this.paused = true;
        this.savedElapsed = Date.now() - this.loopStart;
        for(let graph of this.graphs) {
            graph.pause(this.savedElapsed);
        }
    }

    unpause() {
        if(!this.paused) {
            return;
        }
        if(this.loopStart) {
            this.loopStart = Date.now() - this.savedElapsed;
        }
        this.paused = false;
        this.savedElapsed = null;
        for(let graph of this.graphs) {
            graph.unpause(this.loopStart);
        }
    }

    togglePause() {
        if(this.paused) {
            this.unpause();
        }
        else {
            this.pause();
        }
    }
    
    // TODO: make configurable via map settings, and/or
    // depend on map speed
    countdown(n, rate=500) {
        return new Promise((resolve, reject) => {
            let step = n => {
                if(this.stopped) return resolve(false);
                if(n > 0) {
                    sm.play("count");
                    setTimeout(() => step(n - 1), rate);
                }
                else {
                    resolve(true);
                }
            };
            step(n);
        });
    }

    startJudges() {
        if(this.loopStart) {
            return;
        }
        this.stopped = false;
        this.finished = false;
        // set the start date in the future
        const rewindTime = 350;//ms
        // <dirty hack> to get a single update for viewers
        this.loopStart = Date.now();
        for(let graph of this.graphs) {
            graph.loopStart = this.loopStart;
            graph.updateJudge(this.loopStart - rewindTime);
            graph.loopStart = null;
        }
        this.loopStart = null;
        // </dirty hack>
        this.countdown(3).then(isStarted => {
            if(!isStarted) return;
            this.loopStart = Date.now() + rewindTime;
            for(let graph of this.graphs) {
                graph.startJudge(this.loopStart);
            }
        });
    }

    stopJudges() {
        this.loopStart = null;
        this.stopped = true;
        this.paused = false;
        for(let graph of this.graphs) {
            graph.stopJudge();
        }
        this.shadows = [];
        this.hits = this.total = 0;
        // this.loopCount = -1;
        this.totalNotesPlayed = 0;
    }
    
    resetHitRecord() {
        console.warn("Resetting hit record is deprecated");
        // copy over the last elements to the first (for wrapping around)
        let lastHitRecord = this.hitRecord.at(-1);
        let lastHasPlayed = this.hasPlayed.at(-1);
        this.hitRecord = this.hitRecord.map(() => HitState.Unhit);
        this.hitRecord[0] = lastHitRecord;
        this.hasPlayed = this.hasPlayed.map(() => false);
        this.hasPlayed[0] = lastHasPlayed;
        // this.loopCount++;
    }

    applyEventEffect(now, effects) {
        effects.forEach((effect, i) => {
            if(effect.hitSound) {
                console.log(this.graphs[i].hitSound, "->", effect.hitSound);
                this.graphs[i].hitSound = effect.hitSound;
            }
            // TODO: what if newSides == 0? probably doesn't matter
            if(effect.newSides) {
                // TODO: pause the screen for a bit?
                // TODO: fix for cases other than growing
                this.graphs[i].setVertexCountNow(now, effect.newSides);
            }
        });
    }

    transitionEnd() {
        if(this.finished) return;
        console.log("Finishing!");
        this.finished = true;
    }

    step(now, elapsed) {
        if(!this.loopStart || this.paused || this.stopped) {
            return;
        }
        for(let graph of this.graphs) {
            graph.step(now, elapsed);
        }
        let elapsedSinceStart = now - this.loopStart;
        // exile old shadows
        this.shadows = this.shadows.filter(shadow => now - shadow.born < 1250);
        
        // apply totalNotesPlayed events
        this.events = this.events.filter(event => {
            if(this.totalNotesPlayed >= event?.condition?.totalNotesPlayed) {
                if(event.effects) {
                    this.applyEventEffect(now, event.effects);
                }
                return false;
            }
            return true;
        });

        if(this.finished) {
            return;
        }
        // TODO: for some reason, you can still overhit notes and this messes up counters
        // determine if a note too late to hit
        this.lastElapsed = elapsedSinceStart;
        this.targets.forEach((timing, i) => {
            if(this.hitRecord[i] === HitState.Unhit) {
                if(elapsedSinceStart > timing + this.timings[HitState.Okay]) {
                    //console.log(elapsedSinceStart, timing, this.timings[HitState.Okay]);
                    this.addShadow(this.loopStart + timing, HitState.Miss, this.stepOwners[timing]);
                    this.hitRecord[i] = HitState.Miss;
                    sm.play("miss");
                    this.total += 3;
                }
            }
            if(!this.hasPlayed[i]) {
                if(timing + this.hitSoundOffset < elapsedSinceStart) {
                    let owners = this.stepOwners[timing];
                    for(let ownerIndex of owners) {
                        let hitSound = this.graphs[ownerIndex].hitSound;
                        if(Array.isArray(hitSound)) {
                            let soundIndex = this.graphTargets[ownerIndex].indexOf(timing);
                            hitSound = hitSound[soundIndex % hitSound.length];
                        }
                        sm.play(hitSound);
                    }
                    this.totalNotesPlayed++;
                    console.log("Note played: ", this.totalNotesPlayed);
                    this.hasPlayed[i] = true;
                }
            }
        });

        // determine if song is over (same logic as if a note is too late to hit)
        let lastTiming = this.targets.at(-1);
        if(elapsedSinceStart > lastTiming + this.timings[HitState.Okay]) {
            this.transitionEnd();
        }
    }
}
