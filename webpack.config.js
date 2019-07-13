const path = require('path');

module.exports = {
    entry: './test/index',
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'client.bundle.js'
    },
    devtool: 'inline-source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json']
    },
    module: {
        rules: [{
            // Include ts, tsx, js, and jsx files.
            test: /\.(ts|js)x?$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
        }],
    }
};