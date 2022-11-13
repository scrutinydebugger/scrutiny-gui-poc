import $ from "jquery"

import { Datastore } from "./datastore.ts"
import { ServerConnection } from "./server_connection.js"
import { UI } from "./ui.js"
import { default as logging } from "./logging.ts"

export class App {

    constructor(config) {
        this.config = config
        this.init_promises = [] // During init stage, multiple promises will be generated. App will be ready when they all complete
        this.logger = logging.getLogger("App")
        this.event_logger = logging.getLogger("events")
    }

    getLogger(name) {
        return logging.getLogger(name)
    }

    // Add a layer of abstraction above event handling for easier unit testing without JQuery
    trigger_event(name, data_dict) {
        this.event_logger.debug("Triggering event : " + name)
        if (typeof data_dict == "undefined") {
            data_dict = {}
        }
        $.event.trigger(Object.assign({}, { type: name }, data_dict))
    }

    on_event(name, callback) {
        let that = this
        $(document).on(name, function (data) {
            that.event_logger.debug("Running event callback: " + name)
            callback(data)
        })
    }

    // Must be called after init_all
    launch() {
        let that = this
        this.on_event("scrutiny.ready", function (data) {
            $("#loading_mask").hide()
            that.logger.log("App ready.")
        })

        Promise.all(this.init_promises)
            .then(function () {
                that.trigger_event("scrutiny.ready")
            })
            .catch(function () {
                that.logger.error("App cannot start correctly.")
                // Let's trigger a ready anyway.
                // That will make debugging easier because we need the app to fail where there init
                // error cause a problem.

                that.trigger_event("scrutiny.ready")
            })
    }

    get_template_id(widget, name) {
        // Return the DOM id a of a template from it's name an creator (the widget that registered it)
        let widget_name = null

        if (typeof widget === "string") {
            widget_name = widget
        } else if (typeof widget === "object") {
            widget_name = widget.constructor.name()
        } else {
            widget_name = widget.name()
        }

        return "template-" + widget_name + "-" + name
    }

    get_template(widget, name) {
        // Return a copy of the template from it's name and author (author=widget)
        return $($("#" + this.get_template_id(widget, name)).html())
    }

    load_template(template_id, template_file) {
        // Append the tempalte node to the DOM and register a promise for the init stage when
        // the tmeplate is done loading through Ajax.
        let that = this
        let promise = new Promise(function (resolve, reject) {
            let template = $("<template id='" + template_id + "'></template>")
            $("#template_section").append(template)
            template.load(template_file, "", function (response, status, xhr) {
                if (status == "success") {
                    that.logger.debug(template_file + " loaded")
                    resolve()
                } else {
                    reject()
                }
            })
        })

        // Remember that this must be done before firing a "ready" event. See launch()
        this.init_promises.push(promise)
    }

    init_widget(widget_class) {
        // Do all necessary initialization for a widget to work in the app.
        // This is done once at initialization, not for each instance.

        // Load all CSS required by the widget
        let css_list = widget_class.css_list() // This is a static method
        let file_prefix = "widgets/" + widget_class.name() + "/"
        for (let i = 0; i < css_list.length; i++) {
            let path = file_prefix + css_list[i]
            $("head").append(
                '<link rel="stylesheet" href="' + path + '" type="text/css" />'
            )
        }

        // Load all templates required by the widget.
        let templates = widget_class.templates() // This is a static method
        let keys = Object.keys(templates)
        for (let i = 0; i < keys.length; i++) {
            let template_name = keys[i]
            let template_file = templates[keys[i]]
            template_file = file_prefix + template_file
            let template_id = this.get_template_id(
                widget_class.name(),
                template_name
            )
            this.load_template(template_id, template_file) // Launch ajax and append template to DOM
        }
    }

    init_all() {
        this.ui = new UI($("#layout-container")) // Container for Golden Layour
        this.ui.init()
        this.datastore = new Datastore(this)

        this.server_conn = new ServerConnection(this, this.ui, this.datastore)
        this.server_conn.set_endpoint(
            this.config["server"]["host"],
            this.config["server"]["port"]
        )

        let that = this
        this.on_event("scrutiny.ready", function () {
            that.server_conn.start()
        })
    }

    // Entry point to add a widget to the app. Must be called after init_all
    add_widget(widget_class) {
        this.init_widget(widget_class)
        this.ui.register_widget(widget_class, this)
    }
}
