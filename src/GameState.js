import { RegularGraph } from "./RegularGraph.js";

export class GameState {
    constructor(vertexChangeDelay = 300) {
        this.vertexChangeDelay = vertexChangeDelay;
        this.graphs = [];
    }

    load(json) {
        this.vertexChangeDelay = json.vertexAnimate;
        // this.???? = json.track
        this.graphs = json.graphs.map(data =>
            RegularGraph.fromJSON(data, this.vertexChangeDelay));
        
    }
    
    pause() {
        for(let graph of this.graphs) {
            graph.pause();
        }
    }

    unpause() {
        for(let graph of this.graphs) {
            graph.unpause();
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
    
    step(now, elapsed) {
        for(let graph of this.graphs) {
            graph.step(now, elapsed);
        }
    }
}
