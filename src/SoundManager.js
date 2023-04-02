export class SoundManager {
    constructor() {
        this.sounds = {};
        this.loading = new Set();
        this.resolution = new Set();
        this.checkingReady = false;
        this.isReady = false;
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
