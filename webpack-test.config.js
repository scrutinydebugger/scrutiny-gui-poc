import { resolve } from "path"
import { default as glob } from "glob"
import GitRevisionPlugin from "git-revision-webpack-plugin"
import webpack from "webpack"
import { default as nodeExternals } from "webpack-node-externals"

const gitRevisionPlugin = new GitRevisionPlugin.GitRevisionPlugin()
const OUTPUT_FOLDER = "dist"

export default {
    context: resolve("."),
    target: "node",
    devtool: "source-map",
    entry: glob.sync("./tests/**/*.test.ts"),
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
            SCRUTINY_UNITTEST: true,
        }),
    ],
    output: {
        filename: "scrutiny-test.cjs",
        path: resolve(`${OUTPUT_FOLDER}/js`),
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            "@jquery": resolve("externals/test/jquery"),
            "@src": resolve("webapp/"),
            "@tests": resolve("tests"),
            "@scrutiny-treetable": resolve("webapp/components/scrutiny-treetable/scrutiny-treetable"),
            "@scrutiny-resizable-table": resolve("webapp/components/scrutiny-resizable-table/scrutiny-resizable-table"),
            "@scrutiny-live-edit": resolve("webapp/components/scrutiny-live-edit/scrutiny-live-edit")
        },
    },
    externals: [nodeExternals()],
}
