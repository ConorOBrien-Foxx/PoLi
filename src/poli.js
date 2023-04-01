import { SoundManager } from "./SoundManager.js";
import { GameManager } from "./GameManager.js";
import { FrameTweener } from "./TweenManager.js";

// TODO: RenderManager

let sm = new SoundManager();
// sm.add("hit", "./hit.wav", 3);
// sm.add("hit1", "./ting.wav", 3);
// sm.add("hit2", "./ting-low.wav", 3);
// sm.add("hit3", "./tut.wav", 3);
// TODO: let maps load sounds
sm.add("hit1", "./C5H_s.wav", 3);
sm.add("hit2", "./E5H_s.wav", 3);
sm.add("hit3", "./G5H_s.wav", 3);
sm.add("hit4", "./B5H_s.wav", 3);
sm.add("miss", "./miss.wav", 1);
sm.ready().then(() => {
    console.log("Sounds loaded!");
});
window.sm = sm; //TODO: global, fix

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
}

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
