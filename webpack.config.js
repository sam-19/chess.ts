var path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production'
    return {
        context: __dirname,
        entry: {
            chess: './index.js',
        },
        output: {
            path: path.join(__dirname, './', 'dist'),
            filename: "[name].js"
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
            minimize: isProduction,
            minimizer: [
                new TerserPlugin(),
            ],
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
        },
    }
}
