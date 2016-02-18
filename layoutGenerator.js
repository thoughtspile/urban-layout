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
        this.halfEdges = [];
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

        this.recomputeVec();
        var dir = this.getDir();

        var halfEdgeForw = { free: true, source: this.from, target: this.to, dir: dir };
        var halfEdgeBack = { free: true, source: this.to, target: this.from, dir: (dir + Math.PI) % (2 * Math.PI) };
        halfEdgeForw.twin = halfEdgeBack;
        halfEdgeBack.twin = halfEdgeForw;

        this.forw = halfEdgeForw;
        this.back = halfEdgeBack;

        this.from.halfEdges.push(halfEdgeForw);
        this.to.halfEdges.push(halfEdgeBack);
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
        if (dist(this.to.pos, node.pos) < r) {
            this.to = node;
            this.recomputeVec();
            return true;
        }
        return false;
    };

    mapEdge.prototype.snapToEdge = function(edge, r) {
        return this.snapToNode(edge.to, r)
            || this.snapToNode(edge.from, r);
    };

    mapEdge.prototype.recomputeVec = function() {
        sub(this.to.pos, this.from.pos, this.selfVec);
        return this;
    };

    mapEdge.prototype.getDir = function() {
        var temp = (this.selfVec[1] > 0? 1: -1) * Math.acos(this.selfVec[0] / norm(this.selfVec));
        // FIXME edge should not be 0
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

            spread: .2,
            snapR: .1,
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
        var dir = halfEdge0.dir;
        var node = halfEdge0.target;
        var path = [halfEdge0];
        while (depth < 100) {
            if (node.halfEdges.length == 0)
                return false;

            var halfEdge = node.halfEdges.reduce(function(best, halfEdge) {
                if (halfEdge.free == false)
                    return best;
                var rot = halfEdge.dir - dir;
                if (rot < 0) rot += Math.PI * 2;
                if (rot < best.score) {
                    best.halfEdge = halfEdge;
                    best.score = rot;
                }
                return best;
            }, { score: Infinity}).halfEdge;

            if (!halfEdge)
                return false;

            node = halfEdge.target;
            dir = halfEdge.dir;

            path.push(halfEdge);
            if (halfEdge === halfEdge0) {
                if (path.length > 2) {
                    this.removeCycle(path);
                    this.state.districts.push(path.map(halfEdge => halfEdge.target));
                    return true;
                } else {
                    return false;
                }
            }
            depth++;
        }
        return false;
    };

    layoutGenerator.prototype.cycleFrom = function(edge) {
        this.cycleFromHalfEdge(edge.forw);
        this.cycleFromHalfEdge(edge.back);
        console.log(this.state.districts.length);
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
    window.layoutGenerator = layoutGenerator;
}());
