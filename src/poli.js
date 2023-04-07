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
sm.add("a5", "A5H_s.wav", 2);
sm.add("b5", "B5H_s.wav", 2);
sm.add("c3", "C3H_s.wav", 2);
sm.add("e3", "E3H_s.wav", 2);
sm.add("g3", "G3H_s.wav", 2);
sm.add("b3", "B3H_s.wav", 2);
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

sm.add("miss", "./miss.wav", 5);

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
    // dynamic width/height //
    const gameHolder = document.getElementById("gameHolder");
    const game = document.getElementById("game");
    const gameMenu = document.getElementById("gameMenu");
    const INTERNAL_PADDING = 50;
    const resizeGame = () => {
        let rect = gameHolder.getBoundingClientRect();
        let height = document.body.clientHeight;
        let target = height - rect.y - INTERNAL_PADDING;
        target = Math.min(target, document.body.clientWidth - INTERNAL_PADDING);
        game.style.height = `${target}px`;
        game.style.width = `${target}px`;
        gameMenu.style.height = `${target}px`;
        gameMenu.style.width = `${target}px`;
        let gameRect = game.getBoundingClientRect();
        //console.log(gameRect);
        gameMenu.style.top = `${gameRect.top}px`;
        gameMenu.style.left = `${gameRect.left}px`;
    };
    resizeGame();
    window.addEventListener("resize", resizeGame);
    window.addEventListener("scroll", resizeGame);

    const isInMenu = () => gameMenu.classList.contains("menuState");
    const focusOnGame = () => {
        gameMenu.querySelector(".onMenu").style.display = "none";
        gameMenu.querySelector(".onGame").style.display = "block";
        gameMenu.classList.toggle("menuState");
        // gameMenu.style.height = "1em";
    };
    const focusOnMenu = () => {
        gameMenu.querySelector(".onMenu").style.display = "block";
        gameMenu.querySelector(".onGame").style.display = "none";
        gameMenu.classList.toggle("menuState");
    };

    let gm = new GameManager(game, () => {
        focusOnMenu();
    });
    window.gm=gm;//debugging

    let map1 = await readJSON("./src/maps/test1.json");
    // let map2 = await readJSON("./src/maps/test2.json");
    // let map3 = await readJSON("./src/maps/test3.json");
    let tutorial = await readJSON("./src/maps/tutorial.json");
    let grow = await readJSON("./src/maps/grow.json");
    let grow2 = await readJSON("./src/maps/grow2.json");
    let tri = await readJSON("./src/maps/tri.json");
    let maps = [
        tutorial,
        grow,
        grow2,
        map1,
        tri,
        // map2,
        // map3,
    ];

    // gm.state.load(map1);

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
        if(isInMenu()) return;
        gm.unpause();
    });
    window.addEventListener("blur", function() {
        if(isInMenu()) return;
        gm.pause();
    });

    const startLevel = level => {
        focusOnGame();
        gm.state.stopJudges();
        gm.state.load(maps[level]);
        gm.state.startJudges();
        gm.unpause();
    };
    // TODO: level IDs
    // TODO: generic button behavior
    document.getElementById("startTutorial").addEventListener("click", function () {
        startLevel(0);
    });
    document.getElementById("startGrow").addEventListener("click", function () {
        startLevel(1);
    });
    document.getElementById("startGrow2").addEventListener("click", function () {
        startLevel(2);
    });
    document.getElementById("startThreeFour").addEventListener("click", function () {
        startLevel(3);
    });
    document.getElementById("startTri").addEventListener("click", function () {
        startLevel(43);
    });

    // TODO: check ancestors?
    const isInputTarget = el =>
        el === game || el === gameMenu;
    // mobile input
    window.addEventListener("touchstart", function(ev) {
        if(isInputTarget(ev.target)) {
            let hitStamp = Date.now();
            gm.sendHit(hitStamp);
        }
    });
    // allow click
    window.addEventListener("click", (ev) => {
        if(isInputTarget(ev.target)) {
            let hitStamp = Date.now();
            gm.sendHit(hitStamp);
        }
    });
    window.addEventListener("contextmenu", (ev) => {
        if(isInputTarget(ev.target)) {
            ev.preventDefault();
            let hitStamp = Date.now();
            gm.sendHit(hitStamp);
            return false;
        }
    });
    

    document.getElementById("back").addEventListener("click", function () {
        gm.state.stopJudges();
        focusOnMenu();
    });

    document.getElementById("pause").addEventListener("click", function () {
        gm.state.togglePause();
    });

    const HIT_KEYS = [" ", ...(
        "tab q w e r t y u i o p [ ] \\ a s d f g h j k l "
            + "; ' enter z x c v b n m , . / "
            + "arrowleft arrowright arrowup arrowdown"
    ).split(" ")];
    document.addEventListener("keydown", (ev) => {
        if(ev.key === "Escape") {
            gm.state.stopJudges();
            focusOnMenu();
        }
        let key = ev.key.toLowerCase();
        if(HIT_KEYS.includes(key) && !ev.repeat) {
            // we don't want repeat keys
            let hitStamp = Date.now();
            gm.sendHit(hitStamp);
        }
    });
});
