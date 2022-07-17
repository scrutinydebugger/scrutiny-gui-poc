import { App } from "./app.js";
import { get_url_param } from "./tools.js"

import {VarListWidget} from '/widgets/varlist/varlist.js'
import {WatchWidget} from '/widgets/watch/watch.js'

var default_config = {
    'server': {
        'host': '127.0.0.1',
        'port': 8765
    }
}
var app = null;

function load_config() {
    let config = default_config;

    // If launched through CEF, this will exist.
    if (typeof config_from_python !== 'undefined') {
        config = config_from_python
    }

    // If launched through webbrowser, this config will exist. Let'S give priority to it.
    let url_config = get_url_param('config')   // From tools.js
    if (url_config != '') {
        try {
            let json_utf8 = atob(url_config)
            let config_from_url = JSON.parse(json_utf8)
            config = config_from_url
        } catch (e) {
            console.error(e)
        }
    }

    return config
}


// Executed when document is ready
(function() {
    let config = load_config()
    app = new App(config)
    app.init_all()  

    app.add_widget(VarListWidget)
    app.add_widget(WatchWidget)

    app.launch()    // Will fire the "scrutiny.ready" event when all async init is done.
})();

window.app = app;   // for debugging