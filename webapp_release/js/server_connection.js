import {DeviceStatus, ServerStatus, DatastoreEntryType, AllDatastoreEntryTypes} from "./global_definitions.js"


var WATCHABLE_DOWNLOAD_TYPES = {
    RPV : 'rpv',
    Var_Alias : 'var_alias'
}
class LoadWatchableSession{

    constructor(reqid, download_type){
        this.reqid = reqid
        this.download_type = download_type
        this.canceled = false
        
        this.expected_datastore_size = {}
        for (let i=0; i<AllDatastoreEntryTypes.length; i++){
            this.expected_datastore_size[AllDatastoreEntryTypes[i]] = null
        }
    }
    
    is_canceled(){
        return this.canceled
    }

    set_expected_datastore_size(sizes_per_types){
        if (this.download_type == WATCHABLE_DOWNLOAD_TYPES.RPV){
            if (!sizes_per_types.hasOwnProperty(DatastoreEntryType.RPV)){
                this.cancel()
                throw 'Expected number of RPV is expected'
            }
        }
        else if (this.download_type == WATCHABLE_DOWNLOAD_TYPES.Var_Alias){
            if (!sizes_per_types.hasOwnProperty(DatastoreEntryType.Var) || !sizes_per_types.hasOwnProperty(DatastoreEntryType.Alias)){
                this.cancel()
                throw 'Expected number of Var and Alias is expected'
            }
        }

        for (let i=0; i<AllDatastoreEntryTypes.length; i++){
            if (sizes_per_types.hasOwnProperty(AllDatastoreEntryTypes[i])){
                this.expected_datastore_size[AllDatastoreEntryTypes[i]] = sizes_per_types[AllDatastoreEntryTypes[i]]
            }
        }
    }

    get_required_datastore_size(entry_type){
        if (entry_type == DatastoreEntryType.RPV && !this.download_type==WATCHABLE_DOWNLOAD_TYPES.RPV){
            throw 'Entry type "RPV" not expected for this download'
        }
        if (entry_type == DatastoreEntryType.Alias && !this.download_type==WATCHABLE_DOWNLOAD_TYPES.Var_Alias){
            throw 'Entry type "Alias" not expected for this download'
        }

        if (entry_type == DatastoreEntryType.Var && !this.download_type==WATCHABLE_DOWNLOAD_TYPES.Var_Alias){
            throw 'Entry type "Var" not expected for this download'
        }

        return this.expected_datastore_size[entry_type]
    }

    cancel(){
        this.canceled = true
    }
}



export class ServerConnection {

    constructor(app, ui, datastore) {
        let that = this;
        this.update_ui_interval = 500;
        this.reconnect_interval = 500;
        this.connect_timeout = 1500;
        this.get_status_interval = 2000;

        this.app = app
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
        this.actual_request_id = 0
        this.pending_request_queue = {}
        this.active_donload_session = {}
        this.active_donload_session[WATCHABLE_DOWNLOAD_TYPES.RPV] = null
        this.active_donload_session[WATCHABLE_DOWNLOAD_TYPES.Var_Alias] = null


        this.register_api_callback("inform_server_status", function(data) {
            that.inform_server_status_callback(data)
        })

        this.register_api_callback("response_get_watchable_list", function(data) {
            that.receive_watchable_list(data)
        })

        this.register_api_callback("watchable_update", function(data) {
            that.receive_watchable_update(data)
        })

        this.app.on_event('scrutiny.sfd.loaded', function(data) {
            that.reload_datastore_from_server( WATCHABLE_DOWNLOAD_TYPES.Var_Alias )
        })

        this.app.on_event('scrutiny.device.connected', function(e) {
            that.reload_datastore_from_server(WATCHABLE_DOWNLOAD_TYPES.RPV)
        })

        this.app.on_event('scrutiny.device.diconnected', function(e) {
            that.datastore.clear([DatastoreEntryType.RPV])
            this.cancel_watchable_download_if_any(WATCHABLE_DOWNLOAD_TYPES.RPV)
            this.cancel_watchable_download_if_any(WATCHABLE_DOWNLOAD_TYPES.Var_Alias)
        })

        this.app.on_event('scrutiny.sfd.unloaded', function() {
            that.datastore.clear([DatastoreEntryType.Alias, DatastoreEntryType.Var])
            this.cancel_watchable_download_if_any(WATCHABLE_DOWNLOAD_TYPES.Var_Alias)
        })

        this.app.on_event('scrutiny.server.disconnected', function() {
            that.set_disconnected()
            that.datastore.clear()
        })

        // todo : agglomerate list
        this.app.on_event('scrutiny.datastore.start_watching', function(data) {
            let params = {
                "watchables" : [
                    data.entry.server_id        
                ]
            }

            that.send_request('subscribe_watchable', params)
        })

        // todo : agglomerate list
        this.app.on_event('scrutiny.datastore.stop_watching', function(data) {
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

    cancel_watchable_download_if_any(download_type){
        if(this.active_donload_session.hasOwnProperty(download_type)){
            if (this.active_donload_session[download_type] !== null){
                this.active_donload_session[download_type].cancel()
                this.active_donload_session[download_type] = null;
            }
        }
    }

    set_disconnected() {
        this.cancel_watchable_download_if_any(WATCHABLE_DOWNLOAD_TYPES.Var_Alias)
        this.cancel_watchable_download_if_any(WATCHABLE_DOWNLOAD_TYPES.RPV)
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

    reload_datastore_from_server(download_type) {
        let download_params = {
            'max_per_response': 1000,
            'filter' : {
                'type' : []
            }
        }

        try {

            if (download_type == WATCHABLE_DOWNLOAD_TYPES.Var_Alias){
                if (this.loaded_sfd == null){
                    throw('Cannot process watchable list, no SFD loaded');
                }
                
                this.datastore.clear([DatastoreEntryType.Alias, DatastoreEntryType.Var])
                download_params['filter']['type'] = ['alias', 'var']
            } 
            else if (download_type == WATCHABLE_DOWNLOAD_TYPES.RPV){
                this.datastore.clear([DatastoreEntryType.RPV])
                download_params['filter']['type'] = ['rpv']
            }
            else {
                throw('Unsupported download type ' +  download_type);
            }
            
        } catch(e){
            console.error(e)
            this.cancel_watchable_download_if_any(download_type)    // This accepts garbage an won't throw
            return 
        }
        
        let that = this

        that.chain_request('get_watchable_count').then(function(data) {

            let reqid = that.send_request('get_watchable_list', download_params)
            that.active_donload_session[download_type] = new LoadWatchableSession(reqid, download_type)

            let expected_size={}
            expected_size[DatastoreEntryType.Var] = data['qty']['var'];
            expected_size[DatastoreEntryType.Alias] = data['qty']['alias'];
            expected_size[DatastoreEntryType.RPV] = data['qty']['rpv'];
            that.active_donload_session[download_type].set_expected_datastore_size(expected_size)


        }, function(data) {
            that.cancel_watchable_download_if_any(download_type)
        })
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
            
            this.app.trigger_event("scrutiny.server.disconnected")
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
            this.app.trigger_event("scrutiny.server.disconnected")
        }

        this.set_disconnected()
        this.clear_connect_timeout()
        this.stop_get_status_periodic_call()

        if (this.enable_reconnect) {
            this.try_reconnect(this.reconnect_interval)
        }
    }

    on_socket_open_callback(e) {
        //this.app.trigger_event('scrutiny.server.disconnected')
        this.server_status = ServerStatus.Connected
        this.device_status = DeviceStatus.NA
        this.update_ui();
        this.clear_connect_timeout()

        this.start_get_status_periodic_call()

        this.app.trigger_event("scrutiny.server.connected")
    }

    on_socket_error_callback(e) {
        if (this.server_status == ServerStatus.Connected) {
            this.app.trigger_event("scrutiny.server.disconnected")
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

                this.app.trigger_event("scrutiny.api.rx." + obj.cmd, {"obj": obj})

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
        this.app.on_event('scrutiny.api.rx.' + cmd, function(e) {
            callback(e.obj)
        })
    }

    // =====
    receive_watchable_list(data) {
        let reqid = data['reqid']
        let download_type = null

        if (this.active_donload_session[WATCHABLE_DOWNLOAD_TYPES.Var_Alias] !== null 
            && this.active_donload_session[WATCHABLE_DOWNLOAD_TYPES.Var_Alias].reqid == reqid){
                download_type = WATCHABLE_DOWNLOAD_TYPES.Var_Alias
        }
        else if (this.active_donload_session[WATCHABLE_DOWNLOAD_TYPES.RPV] !== null 
            && this.active_donload_session[WATCHABLE_DOWNLOAD_TYPES.RPV].reqid == reqid){
                download_type = WATCHABLE_DOWNLOAD_TYPES.RPV
        }
        else{
            return
        }

        let download_session = this.active_donload_session[download_type];
        if (download_session.is_canceled()){
            return
        }

        try {

            if (this.server_status != ServerStatus.Connected) {
                download_session.cancel()
            } else if (this.device_status != DeviceStatus.Connected) {
                download_session.cancel()
            } else {
                
                if (download_type == WATCHABLE_DOWNLOAD_TYPES.Var_Alias){
                    for (let i = 0; i < data['content']['var'].length; i++) {
                        this.datastore.add_from_server_def(DatastoreEntryType.Var, data['content']['var'][i])
                    }
    
                    for (let i = 0; i < data['content']['alias'].length; i++) {
                        this.datastore.add_from_server_def(DatastoreEntryType.Alias, data['content']['alias'][i])
                    }

                    if (this.datastore.get_count(DatastoreEntryType.Alias) == download_session.get_required_datastore_size(DatastoreEntryType.Alias) &&
                    this.datastore.get_count(DatastoreEntryType.Var) == download_session.get_required_datastore_size(DatastoreEntryType.Var)){
                        this.datastore.set_ready(DatastoreEntryType.Var)
                        this.datastore.set_ready(DatastoreEntryType.Alias)
                    }else if (this.datastore.get_count(DatastoreEntryType.Alias) > download_session.get_required_datastore_size(DatastoreEntryType.Alias) ||
                    this.datastore.get_count(DatastoreEntryType.Alias) > download_session.get_required_datastore_size(DatastoreEntryType.Alias)){
                        download_session.cancel()
                        console.error("Server gave more data than expected. Downlaod type = " + download_type)
                    }
                }

                if (download_type == WATCHABLE_DOWNLOAD_TYPES.RPV){
                    for (let i = 0; i < data['content']['rpv'].length; i++) {
                        this.datastore.add_from_server_def(DatastoreEntryType.RPV, data['content']['rpv'][i])
                    }

                    if (this.datastore.get_count(DatastoreEntryType.RPV) == download_session.get_required_datastore_size(DatastoreEntryType.RPV)){
                        this.datastore.set_ready(DatastoreEntryType.RPV)
                    }else if (this.datastore.get_count(DatastoreEntryType.Alias) > download_session.get_required_datastore_size(DatastoreEntryType.Alias)){
                        download_session.cancel()
                        console.error("Server gave more data than expected. Downlaod type = " + download_type)
                    }
                }
            }

            if (download_session.is_canceled()){
                this.active_donload_session[download_type] = null
            }

        } catch (e) {
            console.error(e)
            download_session.cancel()
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
                        this.app.trigger_event('scrutiny.device.connected')
                    } else if (this.device_status == DeviceStatus.Connected) {
                        this.app.trigger_event('scrutiny.device.disconnected')
                    }
                }

                this.device_status = new_device_status;
            } catch (e){
                this.device_status = DeviceStatus.NA;
                console.error('[inform_server_status] Received a bad device status')
                console.debug(e)
            }

            try {
                let raise_event = false;
                if (data['loaded_sfd'] == null && this.loaded_sfd != null) {
                    this.app.trigger_event('scrutiny.sfd.unloaded')
                } else if (data['loaded_sfd'] != null) {
                    let must_reload = false
                    if (this.loaded_sfd == null) {
                        must_reload = true
                    } else if (this.loaded_sfd['firmware_id'] != data['loaded_sfd']['firmware_id']) {
                        must_reload = true
                    }

                    if (must_reload) {
                        raise_event = true  
                    }
                }

                this.loaded_sfd = data['loaded_sfd'];
                if (raise_event){
                    this.app.trigger_event('scrutiny.sfd.loaded', {"sfd": data['loaded_sfd']})
                }
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
                    this.datastore.set_value(entry.entry_type, entry, value)
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
