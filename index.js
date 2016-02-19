(function() {
    var layoutGenerator = require('./layoutGenerator.js');

    var nodeGoal = 2000;
    var iterCount = 30;

    var w = window.innerWidth;
    var h = window.innerHeight;
    var sqrSize = Math.min(w, h);

    var map = d3.select('#map-container')
        .append('canvas')
            .attr('width', w)
            .attr('height', h);
    var sx = d3.scale.linear().domain([-3, 3]).range([0, sqrSize]);
    var sy = d3.scale.linear().domain([-3, 3]).range([0, sqrSize]);
    var ctx = map.node().getContext('2d');

    var city = layoutGenerator();

    var step = 0;
    (function animate() {
        var start = Date.now();
        var state = city.generate().state;

        var rangeX = d3.extent(state.streets.nodes.map(node => node.pos[0]));
        var rangeY = d3.extent(state.streets.nodes.map(node => node.pos[0]));
        var rangeU = d3.extent(rangeX.concat(rangeY));
        sx.domain(rangeU);
        sy.domain(rangeU);

        console.log();
        console.log(Date.now() - start, 'ms per step', step);

        ctx.clearRect(0, 0, w, h);
        drawCanvas(state.streets.edges, ctx);
        drawCanvasDistr(state.districts, ctx, state.streets.nodes);

        if (state.streets.nodes.length < nodeGoal && step++ < iterCount)
            window.requestAnimationFrame(animate);
    }());

    function drawCanvas(streets, ctx) {
        console.log(streets.length, 'streets');
        streets.forEach(function(edge) {
            ctx.beginPath();
            if (edge.forw.free && edge.back.free)
                ctx.strokeStyle = 'black';
            else if (edge.forw.free || edge.back.free)
                ctx.strokeStyle = 'green';
            else
                ctx.strokeStyle = 'red';
            ctx.moveTo(sx(edge.from.pos[0]), sy(edge.from.pos[1]));
            ctx.lineTo(sx(edge.to.pos[0]), sy(edge.to.pos[1]));
            ctx.stroke();
        });
    }

    function drawCanvasDistr(dists, ctx, nodes) {
        // var debug = [];
        dists.forEach(function(bord) {
            // debug.push(bord.map(n => nodes.indexOf(n)).join(' '))
            ctx.fillStyle = 'rgba(' + randi(0, 255) + ',' + randi(0, 255) + ',0,.8)';

            ctx.beginPath();
            ctx.moveTo(sx(bord[0].pos[0]), sy(bord[0].pos[1]));
            bord.slice(1).forEach(function(node) {
                ctx.lineTo(sx(node.pos[0]), sy(node.pos[1]));
            });
            ctx.closePath();
            ctx.fill();
        });
        ctx.fillStyle = '#fff';

        console.log(dists.length, 'districts');
        // console.log(debug.sort().join('\n'));
    }

    function drawSVG(streets, map) {
        var join = map.selectAll('line.road').data(streets);
        join.enter()
            .append('line')
            .attr('class', 'road')
            .attr({
                x1: edge => sx(edge.from.pos[0]),
                y1: edge => sy(edge.from.pos[1]),
                x2: edge => sx(edge.to.pos[0]),
                y2: edge => sy(edge.to.pos[1])
            });
        join.exit().remove();
    }
}());
