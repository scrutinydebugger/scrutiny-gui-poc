import { resolve } from "path"
import CopyPlugin from "copy-webpack-plugin"
import GitRevisionPlugin from "git-revision-webpack-plugin"
import webpack from "webpack"

const gitRevisionPlugin = new GitRevisionPlugin.GitRevisionPlugin()

const OUTPUT_FOLDER = "dist"
const DEBUG = true

export default {
    context: resolve("webapp"),
    devtool: "source-map",
    entry: "./scrutiny-main.ts",
    mode: DEBUG ? "development" : "production",
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
        new CopyPlugin({
            patterns: [
                {
                    from: "**",
                    to: resolve(OUTPUT_FOLDER),
                    context: resolve("webapp/public"),
                },
                {
                    from: "**/*.(css|png|html)",
                    to: resolve(OUTPUT_FOLDER),
                    context: resolve("webapp"),
                },
            ],
        }),
        new webpack.DefinePlugin({
            SCRUTINY_VERSION: JSON.stringify(gitRevisionPlugin.version()),
            SCRUTINY_COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
            SCRUTINY_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
            SCRUTINY_DEBUG: DEBUG,
        }),
    ],
    output: {
        filename: "scrutiny.js",
        path: resolve(`${OUTPUT_FOLDER}/js`),
        clean: true,
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    externals: {
        goldenlayout: "GoldenLayout",
        jquery: "jQuery",
    },
}
