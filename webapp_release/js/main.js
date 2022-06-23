var scrutiny_client_config = {
    'server': {
        'host': '127.0.0.1',
        'port': 8765
    }
}




class App {
    constructor() {
        this.ready_event_fired = false
        this.things_to_do_before_ready = {}
    }


    get_url_param(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    load_config() {
        if (typeof config_from_python !== 'undefined') {
            scrutiny_client_config = config_from_python
        }

        let url_config = this.get_url_param('config')
        if (url_config != '') {
            try {
                let json_utf8 = atob(url_config)
                let config_from_url = JSON.parse(json_utf8)
                scrutiny_client_config = config_from_url

            } catch (e) {
                console.error(e)
            }
        }

    }


    check_ready() {
        if (this.ready_event_fired == false) {
            let ready = true;
            let action = Object.keys(this.things_to_do_before_ready)
            for (let i = 0; i < action.length; i++) {
                if (this.things_to_do_before_ready[action] == false) {
                    ready = false
                }
            }

            if (ready) {
                $.event.trigger({
                    type: "scrutiny.ready"
                });
                this.ready_event_fired = true
            }
        }
    }

    get_template_id(widget, name) {
        let widget_name = null

        if (typeof(widget) === 'string') {
            widget_name = widget;
        } else if (typeof(widget) === 'object') {
            widget_name = widget.constructor.name()
        } else {
            widget_name = widget.name()
        }

        return 'template-' + widget_name + "-" + name
    }

    get_template(widget, name) {
        return $($("#" + this.get_template_id(widget, name)).html())
    }

    init_widget(widget_class) {
        let css_list = widget_class.css_list()
        let file_prefix = 'widgets/' + widget_class.name() + '/'
        for (let i = 0; i < css_list.length; i++) {
            let path = file_prefix + css_list[i]
            $('head').append('<link rel="stylesheet" href="' + path + '" type="text/css" />');
        }

        let templates = widget_class.templates()
        let keys = Object.keys(templates)
        for (let i = 0; i < keys.length; i++) {
            let template_name = keys[i];
            let template_file = templates[keys[i]]
            template_file = file_prefix + template_file
            let template_id = this.get_template_id(widget_class.name(), template_name)

            let template = $("<template id='" + template_id + "'></template>")
            $("#template_section").append(template)

            this.things_to_do_before_ready['load-' + template_id] = false
            let that = this
            template.load(template_file, '', function() {
                that.things_to_do_before_ready['load-' + template_id] = true
                that.check_ready()
            });
        }
    }

    hide_loading() {
        $('#loading_mask').hide()
    }

    init_all() {
        this.load_config()
        this.ui = new UI($('#layout-container'));
        this.ui.init()
        this.datastore = new Datastore()

        let config = scrutiny_client_config
        this.server_conn = new ServerConnection(this.ui, this.datastore)
        this.server_conn.set_endpoint(config['server']['host'], config['server']['port'])
        this.server_conn.start()
    }

    add_widget(widget_class) {
        this.init_widget(widget_class)
        this.ui.register_widget(widget_class, this)
    }
}

var app = null;

(function() {
    app = new App()
    app.init_all()

    app.add_widget(VarListWidget)
    app.add_widget(WatchWidget)

    $(document).on('scrutiny.ready', function() {
        app.hide_loading()
    })

    app.check_ready() // May trigger scrutiny.ready
})();

/*
var socket = new WebSocket("ws://127.0.0.1:8765");

socket.onmessage = function(event) {
    console.log(`[message] Data received from server: ${event.data}`);
};

socket.onopen = function() {
    socket.send('{"cmd": "echo", "payload": "patate"}')
};
*/