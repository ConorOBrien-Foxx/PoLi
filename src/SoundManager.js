export class SoundManager {
    constructor() {
        this.sounds = {};
        this.loading = new Set();
        this.resolution = new Set();
        this.checkingReady = false;
        this.isReady = false;
        this.soundQueue = [];
    }
    
    add(name, src, count) {
        if(this.sounds[name]) {
            console.warn("Duplicate key: ", name);
        }
        this.sounds[name] = [];
        for(let i = 0; i < count; i++) {
            let sound = new Audio(`res/snd/${src}`);
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

    queue(name) {
        this.play(name);
        // this.soundQueue.push(name);
    }
    
    playQueue() {
        // TODO: prioritize sounds playing in the queue
        // sometimes, if two sounds are in the queue,
        // one may overwrite the other?
        // or maybe it's if too MANY are in the queue
        // we might not want to queue non-musical sounds
        // like the player's hit/miss sounds, or at least
        // their miss sounds.
        // UPDATE: still not sure why this happens. might
        // not be related to the queue. strange.
        if(!this.soundQueue.length) return;
        if(this.soundQueue.length > 2) {
            console.log(this.soundQueue);
        }
        for(let name of this.soundQueue) {
            this.play(name);
        }
        this.soundQueue.splice(0);
    }

    play(name) {
        console.log(`Playing ${name}`)
        if(!this.sounds[name]) {
            throw new Error(`Could not find sound with name '${name}'`);
        }
        // console.log(this.sounds[name].filter(s=>!s.paused).length);
        let sound = this.sounds[name].find(sound => sound.paused);
        if(!sound) {
            console.warn(`Could not find a playable sound for ${name}`);
        }
        else {
            sound.play();
        }
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
