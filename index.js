(function() {
    var nodeGoal = 10000;
    var iterCount = 10000;

    var w = window.innerWidth;
    var h = window.innerHeight;
    var sqrSize = Math.min(w, h);

    var map = d3.select('#map-container').append('svg')
        .attr('width', w)
        .attr('height', h);

    var city = layoutGenerator();
    var sx = d3.scale.linear().domain([-3, 3]).range([0, sqrSize]);
    var sy = d3.scale.linear().domain([-3, 3]).range([0, sqrSize]);

    var step = 0;
    (function animate() {
        var state = city.generate().state;

        console.log(state.streets.nodes.length)
        map.selectAll('line.road').data(state.streets.edges).enter()
            .append('line')
            .attr('class', 'road')
            .attr({
                x1: edge => sx(edge.from.pos[0]),
                y1: edge => sy(edge.from.pos[1]),
                x2: edge => sx(edge.to.pos[0]),
                y2: edge => sy(edge.to.pos[1])
            });

        if (state.streets.nodes.length < nodeGoal && step++ < iterCount)
            window.requestAnimationFrame(animate);
    }());
}());
