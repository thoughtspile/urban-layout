var vec = require('./vec.js');
var mapHalfEdge = require('./mapHalfEdge.js');


var swapArr2 = [0, 0];

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

module.exports = mapEdge;
