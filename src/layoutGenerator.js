var vec = require('./vec.js');
var mapNode = require('./mapNode.js');
var mapHalfEdge = require('./mapHalfEdge.js');
var mapEdge = require('./mapEdge.js');


function aff(val, min, max) {
    return min + val * (max - min);
}

function prng(min, max) {
    return aff(1/3 * (Math.random() + Math.random() + Math.random()), min, max);
}

function randi(min, max) {
    return Math.floor(aff(Math.random(), min, max));
}


function layoutGenerator() {
    if (!(this instanceof layoutGenerator))
        return new layoutGenerator();
    var start = mapNode(0, 0);
    start.pivots.push(0, Math.PI / 2, Math.PI, -Math.PI / 2);
    this.state = {
        streets: {
            nodes: [start],
            edges: []
        },
        districts: [],

        spread: .3,
        snapR: .4,
        short: .5,
        long: 1
    };
};

layoutGenerator.prototype.removeCycle = function (border) {
    border.forEach(function (halfEdge) {
        halfEdge.free = false;
    });
};

layoutGenerator.prototype.addEdge = function(edge) {
    this.state.streets.edges.push(edge);
    return this;
}

layoutGenerator.prototype.cycleFromHalfEdge = function(halfEdge0) {
    var depth = 0;
    var halfEdge = halfEdge0;
    var path = [halfEdge0];

    while (depth < 100) {
        halfEdge = halfEdge.next();

        if (!halfEdge || halfEdge === path[path.length - 1].twin)
            return false;

        if (halfEdge === halfEdge0) {
            this.removeCycle(path);
            this.state.districts.push(path.map(halfEdge => halfEdge.target));
            return true;
        }

        path.push(halfEdge);
        depth++;
    }
    return false;
};

layoutGenerator.prototype.cycleFrom = function(edge) {
    this.cycleFromHalfEdge(edge.forw);
    this.cycleFromHalfEdge(edge.back);
};

layoutGenerator.prototype.generate = function(t) {
    this.state.streets.nodes.filter(function(node) {
        return node.pivots.length > 0;
    }).forEach(function(node, i, a) {
        var dir = node.pivot() + prng(-this.state.spread, this.state.spread);
        var len = prng(this.state.short, this.state.long);

        var newEdge = mapEdge(node, mapNode(0, 0))
            .offset(dir, len);

        var cropDown = newEdge.adapt(this.state.streets.edges, dir, this.addEdge.bind(this), this.state.snapR);
        var cropUp = false;
        if (!cropDown) {
            cropUp = newEdge.offset(dir, 1.5 * len)
                .adapt(this.state.streets.edges, dir, this.addEdge.bind(this), this.state.snapR);
            if (!cropUp)
                newEdge.offset(dir, len);
        }

        if (cropDown || cropUp) {
            this.cycleFrom(newEdge);
        }

        if (!this.state.streets.edges.some(newEdge.eq, newEdge)) {
            var resNode = newEdge.to;
            if (this.state.streets.nodes.indexOf(resNode) === -1)
                this.state.streets.nodes.push(resNode);

            this.addEdge(newEdge);
        }
    }, this);

    return this;
};


window.randi = randi;
module.exports = layoutGenerator;
