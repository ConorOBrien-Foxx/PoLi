import { SoundManager } from "./SoundManager.js";
import { GameManager } from "./GameManager.js";
import { FrameTweener } from "./TweenManager.js";

// TODO: RenderManager

let sm = new SoundManager();
// sm.add("hit", "./hit.wav", 3);
sm.add("hit1", "./ting.wav", 3);
sm.add("hit2", "./tut.wav", 3);
sm.add("miss", "./miss.wav", 1);
sm.ready().then(() => {
    // sm.play("hit");
});
window.sm = sm; //TODO: global, fix

window.addEventListener("load", function() {
    let gm = new GameManager(document.getElementById("game"));
    window.gm=gm;//debugging
    
    // gm.draw(n);
    let deltaTime, oldTimeStamp, fps;
    let nextUpdate;
    const updatesPerSecond = 25;
    const skipTicks = 1000 / updatesPerSecond;
    console.log(updatesPerSecond, skipTicks);
    
    // let fpsInterval = 1000 / 60; // 60fps
    
    // let then, startTime;
    // let elapsed, now;
    
    const gameLoop = timeStamp => {
        // console.log(timeStamp, "vs", Date.now());
        window.requestAnimationFrame(gameLoop);
        
        /*
        
        now = Date.now();
        elapsed = now - then;
        
        if(elapsed > fpsInterval) {
            then = now - (elapsed % fpsInterval);
            // console.log(elapsed);
            
            FrameTweener.step(elapsed);
            gm.step(elapsed);
            gm.draw(elapsed);
            
        }
        */
        // /*
        
        if(!oldTimeStamp) {
            oldTimeStamp = nextUpdate = timeStamp;
            window.requestAnimationFrame(gameLoop);
            return;
        }
        deltaTime = timeStamp - oldTimeStamp;
        oldTimeStamp = timeStamp;
        // step our logic
        while(nextUpdate < timeStamp) {
            gm.step(skipTicks);
            nextUpdate += skipTicks;
        }
        // step our renderer
        if(!gm.paused) {
            FrameTweener.step(deltaTime);
        }
        // draw
        gm.draw(deltaTime);//deltaTime given for display
        // */
    };
    
    window.requestAnimationFrame(gameLoop);
    // then = Date.now();
    // startTime = then;
    // gameLoop();

    window.addEventListener("focus", function() {
        gm.unpause();
    });
    window.addEventListener("blur", function() {
        gm.pause();
    });
    
    document.addEventListener("keydown", (ev) => {
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
            gm.setVertex(parseInt(ev.key, 10));
        }
        else if(ev.key === "p") {
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
        // sm.play("hit");
    });
});