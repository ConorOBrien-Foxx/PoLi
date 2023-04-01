import { RegularGraph } from "./RegularGraph.js";

export class GameState {
    constructor(vertexChangeDelay = 300) {
        // TODO: abstract into graph type to support multiple graphs
        this.vertexChangeDelay = vertexChangeDelay;
        this.graphs = [
            new RegularGraph({
                vertexChangeDelay,
                xc: 200,
                yc: 300,
                r: 125,
                n: 3,
                hitsound: "hit2",
            }),
            new RegularGraph({
                vertexChangeDelay,
                xc: 500,
                yc: 300,
                r: 125,
                n: 4,
                hitsound: "hit1",
            }),
        ];
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
