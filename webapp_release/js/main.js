var scrutiny_client_config = {
    'server': {
        'host': '127.0.0.1',
        'port': 8765
    }
}

function get_url_param(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function load_config() {
    if (typeof config_from_python !== 'undefined') {
        scrutiny_client_config = config_from_python
    }

    let url_config = get_url_param('config')
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

function init_widget(widget_class) {
    let css_list = widget_class.css_list()
    for (let i = 0; i < css_list.length; i++) {
        let path = 'widgets/' + widget_class.name() + '/' + css_list[i]
        $('head').append('<link rel="stylesheet" href="' + path + '" type="text/css" />');
    }
}

(function() {
    load_config()

    ui = new UI($('#layout-container'));
    ui.init()
    datastore = new Datastore()

    let config = scrutiny_client_config
    server_conn = new ServerConnection(ui, datastore)
    server_conn.set_endpoint(config['server']['host'], config['server']['port'])
    server_conn.start()


    let widget_list = [VarListWidget, WatchWidget]

    for (let i = 0; i < widget_list.length; i++) {
        init_widget(widget_list[i])
        ui.register_widget(widget_list[i], server_conn, datastore)
    }

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