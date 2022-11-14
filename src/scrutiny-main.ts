// @ts-check
;("use strict")

import { App, AppConfig } from "./app"
import { get_url_param } from "./tools"

import { BaseWidget } from "./base_widget"
import { VarListWidget } from "./widgets/varlist/varlist.js"
import { WatchWidget } from "./widgets/watch/watch.js"

import * as $ from "jquery"
import { scrutiny_treetable } from "./components/scrutiny-treetable/scrutiny-treetable"
import { scrutiny_resizable_table } from "./components/scrutiny-resizable-table/scrutiny-resizable-table"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

var default_config: AppConfig = {
    server: {
        host: "127.0.0.1",
        port: 8765,
    },
}

var app: App | null = null

function load_config(): AppConfig {
    let config = default_config

    // If launched through webbrowser, this config will exist. Let'S give priority to it.
    let url_config = get_url_param("config") // From tools.js
    if (url_config != "") {
        try {
            const json_utf8 = Buffer.from(url_config, "base64").toString("utf8")
            const config_from_url = JSON.parse(json_utf8) as AppConfig
            config = config_from_url
        } catch (e) {
            console.error(e)
        }
    }

    return config
}

// Executed when document is ready
;(function () {
    let config = load_config()
    app = new App(config)
    app.init_all()

    app.add_widget(VarListWidget as unknown as typeof BaseWidget)
    app.add_widget(WatchWidget as unknown as typeof BaseWidget)

    app.launch() // Will fire the "scrutiny.ready" event when all async init is done.
})()

interface ScrutinyDebuggableWindow {
    app: App
}
;(window as unknown as ScrutinyDebuggableWindow).app = app // for debugging
