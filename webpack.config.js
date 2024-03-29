var path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = (env, argv) => {
    return {
        context: __dirname,
        entry: {
            index: { import: path.join(__dirname, 'src', 'chess.ts') },
        },
        output: {
            path: path.join(__dirname, './', 'dist'),
            filename: "[name].min.js"
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
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
        },
    }
}
