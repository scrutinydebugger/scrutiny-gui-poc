import { resolve } from "path"
import { default as glob } from "glob"

console.log(glob.sync("tests/test_*.ts"))

export default {
    context: resolve("."),
    entry: glob.sync("./tests/test_*.ts"),
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
        new webpack.DefinePlugin({
            'SCRUTINY_VERSION': JSON.stringify(gitRevisionPlugin.version()),
            'SCRUTINY_COMMITHASH': JSON.stringify(gitRevisionPlugin.commithash()),
            'SCRUTINY_BRANCH': JSON.stringify(gitRevisionPlugin.branch()),
        })
    ],
    output: {
        filename: "scrutiny-test.js",
        path: resolve("webapp_release/js"),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    externals: {
    },
}
