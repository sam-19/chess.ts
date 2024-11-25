var path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = (env, argv) => {
    return {
        mode: 'production',
        context: __dirname,
        entry: {
            index: { import: path.join(__dirname, 'src', 'chess.ts') },
        },
        output: {
            path: path.join(__dirname, './', 'umd'),
            filename: "chess.js",
            library: 'Chess',
            libraryTarget: 'umd',
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader",
                    exclude: /node_modules/,
                    options: {
                    }
                },
            ],
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin(),
            ],
            splitChunks: false,
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
        },
    }
}
