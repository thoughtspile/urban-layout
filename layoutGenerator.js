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
        this.valence = 0;
        this.isActive = true;
    }

    function mapEdge(node1, node2) {
        if (!(this instanceof mapEdge))
            return new mapEdge(node1, node2);
        this.from = node1;
        this.to = node2;
    }

    mapEdge.prototype.intersects = function(edge2) {
        // http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
        var p = this.from.pos;
        var q = edge2.from.pos;
        var r = sub(this.to.pos, p);
        var s = sub(edge2.to.pos, q);

        if (cross(r, s) == 0)
            return false;
        var u = cross(sub(q, p), r) / cross(r, s);
        if (u <= 0 || u >= 1)
            return false;
        var t = cross(sub(q, p), s) / cross(r, s);
        if (t <= 0 || t >= 1)
            return false;
        return sum(p, scalar(t, r));
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
            }
        };
    };

    layoutGenerator.prototype.generate = function(t) {
        var active = this.state.streets.nodes.filter(function(node) {
            return node.isActive;
        });

        active.forEach(function(node, i, a) {
            var pivotI = randi(node.pivots.length);
            var pivotVal = node.pivots.splice(pivotI, 1)[0];

            var dir = pivotVal + prng(0, .3 * Math.PI);
            var len = prng(0, 1);

            var newNode = mapNode(
                node.pos[0] + Math.sin(dir) * len,
                node.pos[1] + Math.cos(dir) * len);
            newNode.valence = 1;
            newNode.pivots.push(dir, dir + .5 * Math.PI, dir - .5 * Math.PI);

            var newEdge = mapEdge(node, newNode);
            this.state.streets.edges.forEach(function(edge) {
                var newPos = newEdge.intersects(edge);
                if (newPos) {
                    newNode.pos[0] = newPos[0];
                    newNode.pos[1] = newPos[1];
                }
            });
            if (isNaN(newNode.pos[0]))
                sdg();

            node.valence += 1;
            if (node.valence > 3)
                node.isActive = false;

            this.state.streets.nodes.push(newNode);
            this.state.streets.edges.push(newEdge);
        }, this);

        return this;
    };

    window.layoutGenerator = layoutGenerator;
}());
