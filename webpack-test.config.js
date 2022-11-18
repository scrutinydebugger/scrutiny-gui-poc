import { resolve } from "path"
import { default as glob } from "glob"
import GitRevisionPlugin from "git-revision-webpack-plugin"
import webpack from "webpack"

const gitRevisionPlugin = new GitRevisionPlugin.GitRevisionPlugin()

const OUTPUT_FOLDER = "dist"

export default {
    context: resolve("."),
    entry: glob.sync("./tests/*.test.ts"),
    mode: "development",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            SCRUTINY_VERSION: JSON.stringify(gitRevisionPlugin.version()),
            SCRUTINY_COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
            SCRUTINY_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
        }),
    ],
    output: {
        filename: "scrutiny-test.js",
        path: resolve(`${OUTPUT_FOLDER}/js`),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    externals: {},
}
