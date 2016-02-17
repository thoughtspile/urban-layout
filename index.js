(function() {
    var nodeGoal = 1000;
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

        console.log(Date.now() - start, 'ms per step', step);
        console.log(state.streets.nodes.length)

        drawCanvas(state.streets.edges, ctx);

        if (state.streets.nodes.length < nodeGoal && step++ < iterCount)
            window.requestAnimationFrame(animate);
    }());

    function drawCanvas(streets, ctx) {
        ctx.clearRect(0, 0, w, h);
        streets.forEach(function(edge) {
            ctx.beginPath();
            ctx.moveTo(sx(edge.from.pos[0]), sy(edge.from.pos[1]));
            ctx.lineTo(sx(edge.to.pos[0]), sy(edge.to.pos[1]));
            ctx.stroke();
        });
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
