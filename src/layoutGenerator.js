var vec = require('./vec.js');
var mapNode = require('./mapNode.js');


var swapArr2 = [0, 0];

function aff(val, min, max) {
    return min + val * (max - min);
}

function prng(min, max) {
    return aff(1/3 * (Math.random() + Math.random() + Math.random()), min, max);
}

function randi(min, max) {
    return Math.floor(aff(Math.random(), min, max));
}


function mapHalfEdge(edge, invert) {
    if (!(this instanceof mapHalfEdge))
        return new mapHalfEdge(edge, invert);

    this.free = true;
    this.invert = Boolean(invert);
    this.source = invert? edge.to: edge.from;
    this.target = invert? edge.from: edge.to;
    this.dir = (!invert)? edge.getDir(): (edge.getDir() + Math.PI) % (2 * Math.PI);

    edge[invert? 'back': 'forw'] = this;
    this.source.halfEdges.push(this);
}

mapHalfEdge.prototype.next = function() {
    var twin = this.twin;
    var dir = this.twin.dir;
    var bestMatch = this.target.halfEdges.reduce(function(best, halfEdge) {
        if (halfEdge.free == false || halfEdge === twin)
            return best;
        var rot = halfEdge.dir - dir;
        while (rot < 0) rot += Math.PI * 2; // FIXME why all the wild variation in angles?
        if (rot < best.score) {
            best.halfEdge = halfEdge;
            best.score = rot;
        }
        return best;
    }, { score: Infinity})
    // console.log(bestMatch.score)
    return bestMatch.halfEdge;
};

mapHalfEdge.prototype.setSource = function (into) {
    var old = this.source;
    old.halfEdges.splice(old.halfEdges.indexOf(this), 1);
    this.source = into;
    into.halfEdges.push(this);
    return this;
};


function mapEdge(node1, node2) {
    if (!(this instanceof mapEdge))
        return new mapEdge(node1, node2);
    this.from = node1;
    this.to = node2;
    this.selfVec = [0, 0];

    var halfEdgeForw = mapHalfEdge(this);
    var halfEdgeBack = mapHalfEdge(this, true);
    halfEdgeForw.twin = halfEdgeBack;
    halfEdgeBack.twin = halfEdgeForw;

    this.recomputeVec();
}

mapEdge.prototype.offset = function(dir, len) {
    this.to.pos[0] = this.from.pos[0] + Math.sin(dir) * len;
    this.to.pos[1] = this.from.pos[1] + Math.cos(dir) * len;
    this.recomputeVec();
    return this;
}

mapEdge.prototype.intersects = function(edge2) {
    // http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
    var p = this.from.pos;
    var r = this.selfVec;
    var s = edge2.selfVec;
    var subqp = vec.sub(edge2.from.pos, p, swapArr2);
    var crossrs = vec.cross(r, s);

    if (crossrs == 0)
        return false;
    var u = vec.cross(subqp, r) / crossrs;
    if (u <= 0 || u >= 1)
        return false;
    var t = vec.cross(subqp, s) / crossrs;
    if (t <= 0 || t >= 1)
        return false;
    return vec.sum(p, vec.scalar(t, r));
}

mapEdge.prototype.crop = function(node) {
    var temp = this.to;
    this.to = node;

    // update half-edges
    this.forw.target = node;
    this.back.setSource(node);

    this.recomputeVec();

    var rest = mapEdge(node, temp); // WATCH used to have recomuteVec
    // rest.forw.free = this.forw.free;
    // rest.back.free = this.back.free;

    return rest;
};

mapEdge.prototype.adapt = function(edges, dir, edgePush, r) {
    var newNode = this.to;

    var conflictEdge = null;
    edges.forEach(function(edge) {
        var newPos = this.intersects(edge);
        if (newPos) {
            newNode.pos[0] = newPos[0];
            newNode.pos[1] = newPos[1];
            this.recomputeVec();
            conflictEdge = edge;
        }
    }, this);

    if (conflictEdge) {
        if (!this.snapToEdge(conflictEdge, r)) {
            edgePush(conflictEdge.crop(newNode));
            newNode.pivots.push(dir);
        }
    } else {
        newNode.pivots.push(dir, dir + .5 * Math.PI, dir - .5 * Math.PI);
    }

    return conflictEdge !== null;
};

mapEdge.prototype.snapToNode = function (node, r) {
    if (vec.dist(this.to.pos, node.pos) < r) {
        this.to = node;
        this.recomputeVec();

        // update half-edges
        var dir = this.getDir();
        this.forw.target = node;
        this.forw.dir = dir;
        this.back.setSource(node);
        this.back.dir = (dir + Math.PI) % (2 * Math.PI);

        return true;
    }
    return false;
};

mapEdge.prototype.snapToEdge = function(edge, r) {
    return this.snapToNode(edge.to, r) || this.snapToNode(edge.from, r);
};

mapEdge.prototype.recomputeVec = function() {
    vec.sub(this.to.pos, this.from.pos, this.selfVec);
    var dir = this.getDir();
    if (this.forw) this.forw.dir = dir
    if (this.back) this.back.dir = (dir + Math.PI) % (2 * Math.PI);
    return this;
};

mapEdge.prototype.getDir = function() {
    var temp = (this.selfVec[1] > 0? 1: -1) * Math.acos(this.selfVec[0] / vec.norm(this.selfVec));
    // FIXME why is edge length 0?
    return isNaN(temp)? 0: temp;
};

mapEdge.prototype.eq = function(edge) {
    return edge.from === this.from && edge.to === this.to;
};


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
