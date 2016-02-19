function mapNode(x, y) {
    if (!(this instanceof mapNode))
        return new mapNode(x, y);
    this.pos = [x, y];
    this.pivots = [];
    this.halfEdges = [];
    this.isActive = true;
}

mapNode.prototype.pivot = function () {
    var pivotI = randi(this.pivots.length);
    return this.pivots.splice(pivotI, 1)[0];
};

module.exports = mapNode;
