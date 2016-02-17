(function() {
    function aff(val, min, max) {
        return min + val * (max - min);
    }

    function prng(min, max) {
        return aff(1/3 * (Math.random() + Math.random() + Math.random()), min, max);
    }

    function randi(min, max) {
        return Math.floor(aff(Math.random(), min, max));
    }


    function mapNode(x, y) {
        if (!(this instanceof mapNode))
            return new mapNode(x, y);
        this.pos = [x, y];
        this.pivots = [];
        this.isActive = true;
    }

    mapNode.prototype.pivot = function () {
        var pivotI = randi(this.pivots.length);
        return this.pivots.splice(pivotI, 1)[0];
    };


    function mapEdge(node1, node2) {
        if (!(this instanceof mapEdge))
            return new mapEdge(node1, node2);
        this.from = node1;
        this.to = node2;
        this.selfVec = [0, 0];
    }

    mapEdge.buffer = [0, 0];

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
        var subqp = sub(edge2.from.pos, p, mapEdge.buffer);

        if (cross(r, s) == 0)
            return false;
        var u = cross(subqp, r) / cross(r, s);
        if (u <= 0 || u >= 1)
            return false;
        var t = cross(subqp, s) / cross(r, s);
        if (t <= 0 || t >= 1)
            return false;
        return sum(p, scalar(t, r));
    }

    mapEdge.prototype.crop = function(node) {
        var temp = this.to;
        this.to = node;
        this.recomputeVec();
        return mapEdge(node, temp).recomputeVec();
    };

    mapEdge.prototype.adapt = function(edges, dir) {
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
            if (!this.snapToEdge(conflictEdge)) {
                edges.push(conflictEdge.crop(newNode));
                newNode.pivots.push(dir);
            }
        } else {
            newNode.pivots.push(dir, dir + .5 * Math.PI, dir - .5 * Math.PI);
        }

        return conflictEdge !== null;
    };

    mapEdge.prototype.snapToNode = function (node) {
        if (dist(this.to.pos, node.pos) < .2) {
            this.to = node;
            this.recomputeVec();
            return true;
        }
        return false;
    };

    mapEdge.prototype.snapToEdge = function(edge) {
        return this.snapToNode(edge.to) || this.snapToNode(edge.from);
    };

    mapEdge.prototype.recomputeVec = function() {
        sub(this.to.pos, this.from.pos, this.selfVec);
        return this;
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
            spread: .3
        };
    };

    layoutGenerator.prototype.generate = function(t) {
        this.state.streets.nodes.filter(function(node) {
            return node.pivots.length > 0;
        }).forEach(function(node, i, a) {
            var dir = node.pivot() + prng(-this.state.spread, this.state.spread);
            var len = prng(0, 1);

            var newEdge = mapEdge(node, mapNode(0, 0))
                .offset(dir, len);

            if (!newEdge.adapt(this.state.streets.edges, dir)) {
                newEdge.offset(dir, 1.5 * len)
                    .adapt(this.state.streets.edges, dir);
            }

            if (!this.state.streets.edges.some(newEdge.eq, newEdge)) {
                this.state.streets.edges.push(newEdge);

                var resNode = newEdge.to;
                if (this.state.streets.nodes.indexOf(resNode) === -1)
                    this.state.streets.nodes.push(resNode);
            }
        }, this);

        return this;
    };


    window.layoutGenerator = layoutGenerator;
}());
