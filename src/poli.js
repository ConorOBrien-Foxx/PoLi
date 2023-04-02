import { SoundManager } from "./SoundManager.js";
import { GameManager } from "./GameManager.js";
import { FrameTweener } from "./TweenManager.js";
import { ImageManager } from "./ImageManager.js";

// TODO: RenderManager

let sm = new SoundManager();
// sm.add("hit", "./tut.wav", 3);
// sm.add("hit1", "./ting.wav", 3);
// sm.add("hit2", "./ting-low.wav", 3);
// sm.add("hit3", "./tut.wav", 3);
// TODO: let maps load sounds
sm.add("c5", "C5H_s.wav", 2);
sm.add("e5", "E5H_s.wav", 2);
sm.add("g5", "G5H_s.wav", 2);
sm.add("b5", "B5H_s.wav", 2);
sm.add("f5", "F5H_s.wav", 2);
sm.add("g4", "G4H_s.wav", 2);
sm.add("b4b", "As4H_Bb4H_s.wav", 2);
sm.add("e4", "E4H_s.wav", 2);
sm.add("count", "ting.wav", 3);
sm.add("hit", "true-hit.wav", 3);
// ALTERNATIVELY: E5b

let im = new ImageManager();
im.spritesheet("sprites", "sprites.png", {
    resolution: 16,
    width: 16,
    height: 16,
});
im.sprite("sprites", "cursor", 0, 0);
im.sprite("sprites", "node", 1, 0);
im.sprite("sprites", "perfect", 0, 1);
im.sprite("sprites", "good", 1, 1);
im.sprite("sprites", "okay", 2, 1);
im.sprite("sprites", "miss", 3, 1);

// C, Eb, F, G, Bb, C

sm.add("miss", "./miss.wav", 2);

sm.ready().then(() => {
    console.log("Sounds loaded!");
});
window.sm = sm; //TODO: global, fix
window.im = im; //TODO: global, fix

const readFileText = (file, mime="application/json") => new Promise((resolve, reject) => {
    let rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            resolve(rawFile.responseText);
        }
    }
    rawFile.send(null);
});

const readJSON = async (file) => {
    let text = await readFileText(file);
    return JSON.parse(text);
};

window.addEventListener("load", async function() {
    let gm = new GameManager(document.getElementById("game"));
    window.gm=gm;//debugging

    let map1 = await readJSON("./src/maps/test1.json");
    let map2 = await readJSON("./src/maps/test2.json");
    let map3 = await readJSON("./src/maps/test3.json");
    let maps = [
        map1,
        map2,
        map3,
    ];

    gm.state.load(map1);

    let now, elapsed;
    const gameLoop = (/*timeStamp*/) => {
        window.requestAnimationFrame(gameLoop);

        now = Date.now();
        elapsed = now - then;
        if(!gm.paused) {
            FrameTweener.step(now, elapsed);
        }
        gm.step(now, elapsed);
        gm.draw(now, elapsed);

        then = now;
    };
    
    let then = Date.now();
    gameLoop();

    // interactivity features //
    window.addEventListener("focus", function() {
        gm.unpause();
    });
    window.addEventListener("blur", function() {
        gm.pause();
    });
    
    const HIT_KEYS = ["z", "x", "c", "v", "b", "n", "m"];
    document.addEventListener("keydown", (ev) => {
        // temporary testing interface
        if(ev.key === "p") {
            gm.state.startJudges();
        }
        else if(ev.key === "o") {
            gm.state.stopJudges();
        }
        else if("1" <= ev.key && ev.key <= "9") {
            gm.state.stopJudges();
            gm.state.load(maps[ev.key - 1]);
        }
        else if(HIT_KEYS.includes(ev.key) && !ev.repeat) {
            // we don't want repeat keys
            let hitStamp = Date.now();
            gm.sendHit(hitStamp);
        }
        /*
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
            gm.setVertexCount(parseInt(ev.key, 10));
        }
        else ...
        */
    });
});
