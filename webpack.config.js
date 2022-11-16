import { resolve } from "path"
import CopyPlugin from "copy-webpack-plugin"
import GitRevisionPlugin from "git-revision-webpack-plugin"
import webpack from "webpack"

const gitRevisionPlugin = new GitRevisionPlugin.GitRevisionPlugin()

export default {
    context: resolve("src"),
    devtool: "source-map",
    entry: "./scrutiny-main.ts",
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
            }
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: "**/*.(css|png|html)",
                    to: resolve("webapp_release"),
                    context: resolve("src"),
                },
            ],
        }),
        new webpack.DefinePlugin({
            'SCRUTINY_VERSION': JSON.stringify(gitRevisionPlugin.version()),
            'SCRUTINY_COMMITHASH': JSON.stringify(gitRevisionPlugin.commithash()),
            'SCRUTINY_BRANCH': JSON.stringify(gitRevisionPlugin.branch()),
        })
    ],
    output: {
        filename: "scrutiny.js",
        path: resolve("webapp_release/js"),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    externals: {
        "goldenlayout": "GoldenLayout",
        jquery: "jQuery",
    },
}
