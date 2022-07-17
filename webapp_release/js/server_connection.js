import {DeviceStatus, ServerStatus, DatastoreEntryType} from "./global_definitions.js"

export class ServerConnection {

    constructor(ui, datastore) {
        let that = this;
        this.update_ui_interval = 500;
        this.reconnect_interval = 500;
        this.connect_timeout = 1500;
        this.get_status_interval = 2000;

        this.ui = ui
        this.datastore = datastore
        this.set_endpoint('127.0.0.1', 8765) // default
        this.socket = null
        this.server_status = ServerStatus.Disconnected
        this.device_status = DeviceStatus.NA
        this.loaded_sfd = null
        this.device_info = null

        this.enable_reconnect = true
        this.connect_timeout_handle = null;

        this.get_status_interval_handle = null
        this.active_sfd_download = null
        this.sfd_download_complete = false
        this.sfd_download_error = false
        this.expected_datastore_size = null
        this.actual_request_id = 0
        this.pending_request_queue = {}


        this.register_api_callback("inform_server_status", function(data) {
            that.inform_server_status_callback(data)
        })

        this.register_api_callback("response_get_watchable_list", function(data) {
            that.receive_watchable_list(data)
        })

        this.register_api_callback("watchable_update", function(data) {
            that.receive_watchable_update(data)
        })

        $(document).on('scrutiny.sfd.loaded', function(e) {
            that.reload_datastore(e.sfd)
        })

        $(document).on('scrutiny.sfd.unloaded', function() {
            that.reload_datastore(null)
        })

        $(document).on('scrutiny.server.disconnected', function() {
            that.set_disconnected()
            that.datastore.clear()
        })

        // todo : agglomerate list
        $(document).on('scrutiny.datastore.start_watching', function(data) {
            let params = {
                "watchables" : [
                    data.entry.server_id        
                ]
            }

            that.send_request('subscribe_watchable', params)
        })

        // todo : agglomerate list
        $(document).on('scrutiny.datastore.stop_watching', function(data) {
            let params = {
                "watchables" : [
                    data.entry.server_id        
                ]
            }

            that.send_request('unsubscribe_watchable', params)
        })

        this.set_disconnected()
        this.update_ui()
    }

    set_disconnected() {
        this.server_status = ServerStatus.Disconnected
        this.device_status = DeviceStatus.NA
        this.loaded_sfd = null
        this.device_info = null
        this.update_ui()
    }

    set_endpoint(hostname, port) {
        this.hostname = hostname
        this.port = port
    }

    reload_datastore(sfd) {
        this.active_sfd_download = sfd
        this.sfd_download_complete = false
        this.sfd_download_error = false
        this.expected_datastore_size = null
        this.datastore.clear()

        if (sfd != null) {

            let that = this

            let download_params = {
                'max_per_response': 1000,
                "filter": {
                    "type": ["var"]
                }
            }

            that.chain_request('get_watchable_count').then(function(data) {

                that.expected_datastore_size = {}
                that.expected_datastore_size[DatastoreEntryType.Var] = data['qty']['var']
                that.expected_datastore_size[DatastoreEntryType.Alias] = data['qty']['alias']

                that.send_request('get_watchable_list', download_params)
            }, function(data) {
                that.sfd_download_error = true
            })

        }
    }


    start() {
        let that = this
        this.enable_reconnect = true
        this.create_socket()
        this.server_status = ServerStatus.Connecting

        setInterval(function() {
            that.update_ui();
        }, this.update_ui_interval)

        this.update_ui();
    }

    stop() {
        this.enable_reconnect = false;
        if (this.socket !== null) {
            this.socket.close()
        }

        if (this.server_status == ServerStatus.Connected) {
            $.event.trigger({
                type: "scrutiny.server.disconnected"
            });
        }
    }

    send_request(cmd, params = {}) {
        let reqid = null
        if (this.socket !== null) {
            if (this.socket.readyState == this.socket.OPEN) {
                try {
                    reqid = this.actual_request_id++;
                    params['cmd'] = cmd;
                    params['reqid'] = reqid;
                    let payload = JSON.stringify(params)
                    console.debug('Sending: ' + payload)
                    this.socket.send(payload)
                } catch (e) {
                    reqid = null
                    console.error('Cannot send request with command=' + cmd + '. Error: ' + e)
                }
            }
        }

        return reqid
    }

    chain_request(cmd, params = {}) {
        let reqid = this.send_request(cmd, params)

        let that = this
        return new Promise(function(resolve, reject) {
            if (reqid != null) {
                that.pending_request_queue[reqid] = {
                    'resolve': resolve,
                    'reject': reject
                }
            } else {
                reject() // Could not send the request
            }

            setTimeout(function() {
                // Reject the Promise and delete it
                reject()
                if (that.pending_request_queue.hasOwnProperty(reqid)) {
                    delete that.pending_request_queue[reqid]
                }
            }, 2000)

        })
    }

    create_socket() {
        let that = this; // Javascript is such a beautiful language
        this.socket = new WebSocket("ws://" + this.hostname + ":" + this.port);
        this.socket.onmessage = function(e) {
            that.on_socket_message_callback(e.data)
        }
        this.socket.onclose = function(e) {
            that.on_socket_close_callback(e);
        }
        this.socket.onopen = function(e) {
            that.on_socket_open_callback(e);
        }
        this.socket.on_error = function(e) {
            that.on_socket_error_callback(e);
        }

        this.connect_timeout_handle = setTimeout(function() {
            if (that.socket != that.socket.OPEN) {
                that.socket.close()
            }
        }, this.connect_timeout)
    }

    start_get_status_periodic_call() {
        let that = this;
        this.stop_get_status_periodic_call()
        that.send_request('get_server_status')
        this.get_status_interval_handle = setInterval(function() {
            that.send_request('get_server_status')
        }, this.get_status_interval)
    }

    stop_get_status_periodic_call() {
        if (this.get_status_interval_handle !== null) {
            clearInterval(this.get_status_interval_handle)
            this.get_status_interval_handle = null
        }
    }

    update_ui() {
        this.ui.set_server_status(this.server_status)
        this.ui.set_device_status(this.device_status, this.device_info)
        this.ui.set_loaded_sfd(this.loaded_sfd)
    }

    clear_connect_timeout() {
        if (this.connect_timeout_handle != null) {
            clearTimeout(this.connect_timeout_handle)
            this.connect_timeout_handle = null
        }
    }

    on_socket_close_callback(e) {
        if (this.server_status == ServerStatus.Connected) {
            $.event.trigger({
                type: "scrutiny.server.disconnected"
            });
        }

        this.set_disconnected();
        this.clear_connect_timeout()
        this.stop_get_status_periodic_call()

        if (this.enable_reconnect) {
            this.try_reconnect(this.reconnect_interval)
        }
    }

    on_socket_open_callback(e) {
        $.event.trigger('scrutiny.server.disconnected')
        this.server_status = ServerStatus.Connected
        this.device_status = DeviceStatus.NA
        this.update_ui();
        this.clear_connect_timeout()

        this.start_get_status_periodic_call()

        $.event.trigger({
            type: "scrutiny.server.connected"
        });
    }

    on_socket_error_callback(e) {
        if (this.server_status == ServerStatus.Connected) {
            $.event.trigger({
                type: "scrutiny.server.disconnected"
            });
        }

        this.set_disconnected();
        this.clear_connect_timeout()
        this.stop_get_status_periodic_call()
        if (this.enable_reconnect) {
            this.try_reconnect(this.reconnect_interval)
        }
    }

    try_reconnect(delay) {
        let that = this
        setTimeout(function() {
            that.create_socket()
        }, delay)
    }

    // When we receive a datagram from the server
    on_socket_message_callback(msg) {
        try {
            console.debug('Received: ' + msg)
            let obj = JSON.parse(msg)

            // Server is angry. Try to understand why
            if (obj.cmd == "error") {

                let error_message = 'Got an error response from the server for request "' + obj.request_cmd + '".'
                if (obj.hasOwnProperty('msg')) {
                    error_message += obj.msg
                }

                // Settle the Promise and delete it
                if (obj.hasOwnProperty('reqid')) {
                    if (this.pending_request_queue.hasOwnProperty(obj['reqid'])) {
                        this.pending_request_queue[obj['reqid']]['reject'](obj)
                        delete this.pending_request_queue[obj['reqid']]
                    }
                }

                console.error(error_message)
            } else { // Server is happy, spread the news

                $.event.trigger({
                    type: "scrutiny.api.rx." + obj.cmd,
                    obj: obj
                });

                // Settle the Promise and delete it
                if (obj.hasOwnProperty('reqid')) {
                    if (this.pending_request_queue.hasOwnProperty(obj['reqid'])) {
                        this.pending_request_queue[obj['reqid']]['resolve'](obj)
                        delete this.pending_request_queue[obj['reqid']]
                    }
                }

            }
        } catch (error) {
            // Server is drunk. Ignore him.
            console.log('Error while processing message from server. ' + error)
        }
    }

    register_api_callback(cmd, callback) {
        $(document).on('scrutiny.api.rx.' + cmd, function(e) {
            callback(e.obj)
        })
    }

    // =====
    receive_watchable_list(data) {
        if (this.active_sfd_download == null)
            return

        if (this.sfd_download_complete)
            return

        if (this.sfd_download_error)
            return

        try {

            if (this.server_status != ServerStatus.Connected) {
                this.sfd_download_error = true
            } else if (this.device_status != DeviceStatus.Connected) {
                this.sfd_download_error = true
            } else if (this.loaded_sfd == null) {
                this.sfd_download_error = true
            } else if (this.loaded_sfd['firmware_id'] != this.active_sfd_download['firmware_id']) {
                this.sfd_download_error = true
            } else if (this.expected_datastore_size == null) {
                this.sfd_download_error = true
            } else {
                for (let i = 0; i < data['content']['var'].length; i++) {
                    this.datastore.add_from_server_def(DatastoreEntryType.Var, data['content']['var'][i])
                }

                for (let i = 0; i < data['content']['alias'].length; i++) {
                    this.datastore.add_from_server_def(DatastoreEntryType.Alias, data['content']['alias'][i])
                }

                var actual_count = this.datastore.get_count()

                if (this.expected_datastore_size[DatastoreEntryType.Var] == actual_count[DatastoreEntryType.Var] &&
                    this.expected_datastore_size[DatastoreEntryType.Alias] == actual_count[DatastoreEntryType.Alias]) {
                    this.sfd_download_complete = true
                    this.active_sfd_download = null
                    this.datastore.set_ready()
                } else {
                    if (actual_count[DatastoreEntryType.Var] > this.expected_datastore_size[DatastoreEntryType.Var] ||
                        actual_count[DatastoreEntryType.Alias] > this.expected_datastore_size[DatastoreEntryType.Alias]) {
                        this.sfd_download_error = true
                        console.error("Server gave more data than expected!")
                    }
                }
            }

        } catch (e) {
            this.sfd_download_error = true
            console.error(e)
        }
    }



    inform_server_status_callback(data) {
        let device_status_str_to_obj = {
            'unknown': DeviceStatus.NA,
            'disconnected': DeviceStatus.Disconnected,
            'connecting': DeviceStatus.Connecting,
            'connected': DeviceStatus.Connecting,
            'connected_ready': DeviceStatus.Connected
        }

        try {
            try {
                let new_device_status = device_status_str_to_obj[data.device_status];
                if (new_device_status != this.device_status) {
                    if (new_device_status == DeviceStatus.Connected) {
                        $.event.trigger({
                            type: 'scrutiny.device.connected'
                        })
                    } else if (this.device_status == DeviceStatus.Connected) {
                        $.event.trigger({
                            type: 'scrutiny.device.disconnected'
                        })
                    }
                }

                this.device_status = new_device_status;
            } catch {
                this.device_status = DeviceStatus.NA;
                console.error('[inform_server_status] Received a bad device status')
            }

            try {

                if (data['loaded_sfd'] == null && this.loaded_sfd != null) {
                    $.event.trigger({
                        type: 'scrutiny.sfd.unloaded'
                    })
                } else if (data['loaded_sfd'] != null) {
                    let must_reload = false
                    if (this.loaded_sfd == null) {
                        must_reload = true
                    } else if (this.loaded_sfd['firmware_id'] != data['loaded_sfd']['firmware_id']) {
                        must_reload = true
                    }

                    if (must_reload) {
                        $.event.trigger({
                            type: 'scrutiny.sfd.loaded',
                            sfd: data['loaded_sfd']
                        })
                    }
                }

                this.loaded_sfd = data['loaded_sfd'];
            } catch (e) {
                this.loaded_sfd = null
                console.error('[inform_server_status] Cannot read loaded firmware. ' + e)
            }

            try {
                this.device_info = data['device_info'];
            } catch (e) {
                this.device_info = null
                console.error('[inform_server_status] Cannot read device info. ' + e)
            }

        } catch (e) {
            console.error('[inform_server_status] Unexpected error. ' + e)
        }

        this.update_ui()
    }

    receive_watchable_update(data){
        try{
            let updates = data['updates']
            for(let i=0; i<updates.length; i++){
                let server_id = updates[i].id
                let value = updates[i].value

                try {
                    let entry = this.datastore.get_entry_from_server_id(server_id)
                    this.datastore.set_value(entry, value)
                }
                catch(e){
                    console.log(`Cannot update value of entry with server ID ${server_id}. ` + e)
                }
            }
        }catch(e)
        {
            console.error('[receive_watchable_update] Received a bad update list. ' + e)
        }
    }
}