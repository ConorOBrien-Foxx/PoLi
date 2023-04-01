import { SoundManager } from "./SoundManager.js";
import { GameManager } from "./GameManager.js";
import { FrameTweener } from "./TweenManager.js";

// TODO: RenderManager

let sm = new SoundManager();
// sm.add("hit", "./hit.wav", 3);
sm.add("hit1", "./ting.wav", 3);
// sm.add("hit2", "./tut.wav", 3);
sm.add("hit2", "./ting-low.wav", 3);
sm.add("miss", "./miss.wav", 1);
sm.ready().then(() => {
    console.log("Sounds loaded!");
});
window.sm = sm; //TODO: global, fix

window.addEventListener("load", function() {
    let gm = new GameManager(document.getElementById("game"));
    window.gm=gm;//debugging

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
        if(ev.key === "p") {
            // temporary
            for(let graph of gm.state.graphs) {
                graph.startJudge(0);
            }
        }
        else if(ev.key === "o") {
            for(let graph of gm.state.graphs) {
                graph.stopJudge();
            }
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
