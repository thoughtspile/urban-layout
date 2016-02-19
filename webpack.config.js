var path = require('path');

module.exports = {
    entry:  './src/index.js',
    output: {
        path: 'build',
        filename: 'bundle.js'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: path.resolve(__dirname, 'src'),
                query: {
                    presets: ['es2015']
                }
            }
        ]
    }
};
