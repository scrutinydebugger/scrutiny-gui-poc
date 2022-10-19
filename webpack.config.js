import { resolve } from "path"
import CopyPlugin from "copy-webpack-plugin"

export default {
    context: resolve("src"),
    devtool: "source-map",
    entry: "./scrutiny-main.js",
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
        new CopyPlugin({
            patterns: [
                {
                    from: "**/*.(css|png|html)",
                    to: resolve("webapp_release"),
                    context: resolve("src"),
                },
            ],
        }),
    ],
    output: {
        filename: "scrutiny.js",
        path: resolve("webapp_release/js"),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    externals: {
        "golden-layout": "GoldenLayout",
        jquery: "jQuery",
    },
}
