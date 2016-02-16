function norm(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}

function cross(a, b) {
    return a[0] * b[1] - a[1] * b[0];
}

function rescale(a, l) {
    var na = norm(a);
    return [
        a[0] / na * l,
        a[1] / na * l
    ];
}

function scalar(n, x) {
    return [n * x[0], n * x[1]];
}

function sum(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}

function times(n, a) {
    return [n * a[0], n * a[1]];
}

function sub(a, b) {
    return sum(a, times(-1, b));
}

function dist (c1, c2) {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2))
};
