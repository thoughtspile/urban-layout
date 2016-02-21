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

module.exports = mapHalfEdge;
