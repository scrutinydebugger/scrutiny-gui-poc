//    server_connection.ts
//        Handles the communication with the server
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { DeviceStatus, ServerStatus } from "./global_definitions"
import { App } from "./app"
import { UI } from "./ui"
import { Logger } from "./logging"
import { Datastore, DatastoreEntryType, AllDatastoreEntryTypes } from "./datastore"
import * as API from "./server_api"

enum WatchableDownloadType {
    RPV = "rpv",
    Var_Alias = "var_alias",
}

class LoadWatchableSession {
    reqid: number
    download_type: WatchableDownloadType
    canceled: boolean
    expected_datastore_size: Record<DatastoreEntryType, number | null>

    constructor(reqid: number, download_type: WatchableDownloadType) {
        this.reqid = reqid
        this.download_type = download_type
        this.canceled = false

        this.expected_datastore_size = {} as typeof this.expected_datastore_size
        for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
            this.expected_datastore_size[AllDatastoreEntryTypes[i]] = null
        }
    }

    is_canceled(): boolean {
        return this.canceled
    }

    set_expected_datastore_size(sizes_per_types: Record<DatastoreEntryType, number>): void {
        if (this.download_type == WatchableDownloadType.RPV) {
            if (!sizes_per_types.hasOwnProperty(DatastoreEntryType.RPV)) {
                this.cancel()
                throw "Expected number of RPV is expected"
            }
        } else if (this.download_type == WatchableDownloadType.Var_Alias) {
            if (!sizes_per_types.hasOwnProperty(DatastoreEntryType.Var) || !sizes_per_types.hasOwnProperty(DatastoreEntryType.Alias)) {
                this.cancel()
                throw "Expected number of Var and Alias is expected"
            }
        }

        for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
            if (sizes_per_types.hasOwnProperty(AllDatastoreEntryTypes[i])) {
                this.expected_datastore_size[AllDatastoreEntryTypes[i]] = sizes_per_types[AllDatastoreEntryTypes[i]]
            }
        }
    }

    get_required_datastore_size(entry_type: DatastoreEntryType): number | null {
        if (entry_type == DatastoreEntryType.RPV && !(this.download_type == WatchableDownloadType.RPV)) {
            throw 'Entry type "RPV" not expected for this download'
        }
        if (entry_type == DatastoreEntryType.Alias && !(this.download_type == WatchableDownloadType.Var_Alias)) {
            throw 'Entry type "Alias" not expected for this download'
        }

        if (entry_type == DatastoreEntryType.Var && !(this.download_type == WatchableDownloadType.Var_Alias)) {
            throw 'Entry type "Var" not expected for this download'
        }

        return this.expected_datastore_size[entry_type]
    }

    cancel(): void {
        this.canceled = true
    }
}

export class ServerConnection {
    hostname: string
    port: number

    update_ui_interval: number
    reconnect_interval: number
    connect_timeout: number
    get_status_interval: number

    app: App
    ui: UI
    logger: Logger
    comm_logger: Logger
    datastore: Datastore
    socket: WebSocket | null
    server_status: ServerStatus
    device_status: DeviceStatus
    loaded_sfd: API.ScrutinyFirmwareDescription | null
    device_info: API.DeviceInformation | null
    get_status_interval_handle: number | null

    enable_reconnect: boolean
    pending_request_queue: Record<
        number,
        {
            resolve: (val?: any) => void
            reject: (val?: any) => void
        }
    >
    connect_timeout_handle: number | null
    actual_request_id: number

    active_download_session: Record<WatchableDownloadType, LoadWatchableSession | null>

    constructor(app: App, ui: UI, datastore: Datastore) {
        const that = this
        this.update_ui_interval = 500
        this.reconnect_interval = 500
        this.connect_timeout = 1500
        this.get_status_interval = 2000

        this.app = app
        this.ui = ui
        this.logger = app.getLogger("server-manager")
        this.comm_logger = app.getLogger("server-comm")
        this.datastore = datastore
        this.hostname = "127.0.0.1"
        this.port = 8765
        this.socket = null
        this.server_status = ServerStatus.Disconnected
        this.device_status = DeviceStatus.NA
        this.loaded_sfd = null
        this.device_info = null

        this.enable_reconnect = true
        this.connect_timeout_handle = null

        this.get_status_interval_handle = null
        this.actual_request_id = 0
        this.pending_request_queue = {}
        this.active_download_session = {} as typeof this.active_download_session
        this.active_download_session[WatchableDownloadType.RPV] = null
        this.active_download_session[WatchableDownloadType.Var_Alias] = null

        this.register_api_callback("inform_server_status", function (data: API.Message.S2C.InformServerStatus) {
            that.inform_server_status_callback(data)
        })

        this.register_api_callback("response_get_watchable_list", function (data: API.Message.S2C.GetWatchableList) {
            that.receive_watchable_list(data)
        })

        this.register_api_callback("watchable_update", function (data: API.Message.S2C.WatchableUpdate) {
            that.receive_watchable_update(data)
        })

        this.app.on_event("scrutiny.sfd.loaded", function (data) {
            that.reload_datastore_from_server(WatchableDownloadType.Var_Alias)
        })

        this.app.on_event("scrutiny.device.connected", function (e) {
            that.reload_datastore_from_server(WatchableDownloadType.RPV)
        })

        this.app.on_event("scrutiny.device.disconnected", function (e) {
            that.datastore.clear([DatastoreEntryType.RPV])
            that.cancel_watchable_download_if_any(WatchableDownloadType.RPV)
            that.cancel_watchable_download_if_any(WatchableDownloadType.Var_Alias)
        })

        this.app.on_event("scrutiny.sfd.unloaded", function () {
            that.datastore.clear([DatastoreEntryType.Alias, DatastoreEntryType.Var])
            that.cancel_watchable_download_if_any(WatchableDownloadType.Var_Alias)
        })

        this.app.on_event("scrutiny.server.disconnected", function () {
            that.set_disconnected()
            that.datastore.clear()
        })

        // todo : agglomerate list
        this.app.on_event("scrutiny.datastore.start_watching", function (data) {
            let params = {
                watchables: [data.entry.server_id],
            }

            that.send_request("subscribe_watchable", params)
        })

        // todo : agglomerate list
        this.app.on_event("scrutiny.datastore.stop_watching", function (data) {
            let params = {
                watchables: [data.entry.server_id],
            }

            that.send_request("unsubscribe_watchable", params)
        })

        this.set_disconnected()
        this.update_ui()
    }

    cancel_watchable_download_if_any(download_type: WatchableDownloadType): void {
        if (download_type !== null) {
            if (this.active_download_session.hasOwnProperty(download_type)) {
                const session = this.active_download_session[download_type] // Typescript is picky here
                if (session !== null) {
                    session.cancel()
                }
                this.active_download_session[download_type] = null
            }
        }
    }

    set_disconnected(): void {
        this.cancel_watchable_download_if_any(WatchableDownloadType.Var_Alias)
        this.cancel_watchable_download_if_any(WatchableDownloadType.RPV)
        this.server_status = ServerStatus.Disconnected
        this.device_status = DeviceStatus.NA
        this.loaded_sfd = null
        this.device_info = null
        this.update_ui()
    }

    set_endpoint(hostname: string, port: number): void {
        this.hostname = hostname
        this.port = port
    }

    reload_datastore_from_server(download_type: WatchableDownloadType): void {
        if (download_type == null) {
            throw "Missing download_type"
        }
        let download_params: Partial<API.Message.C2S.GetWatchableList> = {
            max_per_response: 1000,
        }
        download_params.filter = {}

        try {
            if (download_type == WatchableDownloadType.Var_Alias) {
                if (this.loaded_sfd == null) {
                    throw "Cannot process watchable list, no SFD loaded"
                }

                this.datastore.clear([DatastoreEntryType.Alias, DatastoreEntryType.Var])
                download_params.filter.type = ["alias", "var"]
            } else if (download_type == WatchableDownloadType.RPV) {
                this.datastore.clear([DatastoreEntryType.RPV])
                download_params.filter.type = ["rpv"]
            } else {
                throw "Unsupported download type " + download_type
            }
        } catch (e: any) {
            this.logger.error(e, e)
            this.cancel_watchable_download_if_any(download_type) // This accepts garbage an won't throw
            return
        }

        const that = this

        that.chain_request("get_watchable_count").then(
            function (data) {
                const reqid = that.send_request("get_watchable_list", download_params)
                if (reqid == null) {
                    return
                }
                const new_session = new LoadWatchableSession(reqid, download_type)

                let expected_size = {} as Record<DatastoreEntryType, number>
                expected_size[DatastoreEntryType.Var] = data["qty"]["var"]
                expected_size[DatastoreEntryType.Alias] = data["qty"]["alias"]
                expected_size[DatastoreEntryType.RPV] = data["qty"]["rpv"]
                new_session.set_expected_datastore_size(expected_size)
                that.active_download_session[download_type] = new_session
            },
            function (data) {
                that.cancel_watchable_download_if_any(download_type)
            }
        )
    }

    start(): void {
        const that = this
        this.enable_reconnect = true
        this.create_socket()
        this.server_status = ServerStatus.Connecting

        setInterval(function () {
            that.update_ui()
        }, this.update_ui_interval)

        this.update_ui()
    }

    stop(): void {
        this.enable_reconnect = false
        if (this.socket !== null) {
            this.socket.close()
        }

        if (this.server_status == ServerStatus.Connected) {
            this.app.trigger_event("scrutiny.server.disconnected")
        }
    }

    send_request(cmd: string, params: any = {}): number | null {
        let reqid = null
        if (this.socket !== null) {
            if (this.socket.readyState == this.socket.OPEN) {
                try {
                    reqid = this.actual_request_id++
                    params["cmd"] = cmd
                    params["reqid"] = reqid
                    let payload = JSON.stringify(params)
                    this.comm_logger.debug("Sending: " + payload)
                    this.socket.send(payload)
                } catch (e) {
                    reqid = null
                    this.logger.error("Cannot send request with command=" + cmd + ". Error: " + e)
                }
            }
        }

        return reqid
    }

    chain_request(cmd: string, params: any = {}): Promise<any> {
        const that = this
        const reqid = this.send_request(cmd, params)

        return new Promise(function (resolve, reject) {
            if (reqid != null) {
                that.pending_request_queue[reqid] = {
                    resolve: resolve,
                    reject: reject,
                }

                setTimeout(function () {
                    // Reject the Promise and delete it
                    reject()
                    if (that.pending_request_queue.hasOwnProperty(reqid)) {
                        delete that.pending_request_queue[reqid]
                    }
                }, 2000)
            } else {
                reject() // Could not send the request
            }
        })
    }

    create_socket(): void {
        const that = this // Javascript is such a beautiful language
        this.socket = new WebSocket("ws://" + this.hostname + ":" + this.port)
        this.socket.onmessage = function (e) {
            that.on_socket_message_callback(e.data)
        }
        this.socket.onclose = function (e) {
            that.on_socket_close_callback(e)
        }
        this.socket.onopen = function (e) {
            that.on_socket_open_callback(e)
        }
        this.socket.onerror = function (e) {
            that.on_socket_error_callback(e)
        }

        this.connect_timeout_handle = setTimeout(
            function () {
                if (that.socket !== null) {
                    if (that.socket.readyState != that.socket.OPEN) {
                        that.socket.close()
                    }
                }
            } as Function,
            this.connect_timeout
        )
    }

    start_get_status_periodic_call(): void {
        const that = this
        this.stop_get_status_periodic_call()
        this.send_request("get_server_status")
        this.get_status_interval_handle = setInterval(
            function () {
                that.send_request("get_server_status")
            } as Function,
            this.get_status_interval
        )
    }

    stop_get_status_periodic_call(): void {
        if (this.get_status_interval_handle !== null) {
            clearInterval(this.get_status_interval_handle)
            this.get_status_interval_handle = null
        }
    }

    update_ui(): void {
        this.ui.set_server_status(this.server_status)
        this.ui.set_device_status(this.device_status, this.device_info)
        this.ui.set_loaded_sfd(this.loaded_sfd)
    }

    clear_connect_timeout(): void {
        if (this.connect_timeout_handle != null) {
            clearTimeout(this.connect_timeout_handle)
            this.connect_timeout_handle = null
        }
    }

    on_socket_close_callback(e: CloseEvent): void {
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

    on_socket_open_callback(e: Event): void {
        //this.app.trigger_event('scrutiny.server.disconnected')
        this.server_status = ServerStatus.Connected
        this.device_status = DeviceStatus.NA
        this.update_ui()
        this.clear_connect_timeout()

        this.start_get_status_periodic_call()

        this.app.trigger_event("scrutiny.server.connected")
    }

    on_socket_error_callback(e: Event): void {
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

    try_reconnect(delay_ms: number): void {
        const that = this
        setTimeout(
            function () {
                that.create_socket()
            } as Function,
            delay_ms
        )
    }

    // When we receive a datagram from the server
    on_socket_message_callback(msg: string): void {
        try {
            this.comm_logger.debug("Received: " + msg)
            const obj = JSON.parse(msg)

            // Server is angry. Try to understand why
            if (obj.cmd == "error") {
                let error_message = 'Got an error response from the server for request "' + obj.request_cmd + '".'
                if (obj.hasOwnProperty("msg")) {
                    error_message += obj.msg
                }

                // Settle the Promise and delete it
                if (obj.hasOwnProperty("reqid")) {
                    if (this.pending_request_queue.hasOwnProperty(obj["reqid"])) {
                        this.pending_request_queue[obj["reqid"]]["reject"](obj)
                        delete this.pending_request_queue[obj["reqid"]]
                    }
                }

                this.logger.error(error_message)
            } else {
                // Server is happy, spread the news

                this.app.trigger_event("scrutiny.api.rx." + obj.cmd, { obj: obj })

                // Settle the Promise and delete it
                if (obj.hasOwnProperty("reqid")) {
                    if (this.pending_request_queue.hasOwnProperty(obj["reqid"])) {
                        this.pending_request_queue[obj["reqid"]]["resolve"](obj)
                        delete this.pending_request_queue[obj["reqid"]]
                    }
                }
            }
        } catch (error) {
            // Server is drunk. Ignore him.
            this.logger.log("Error while processing message from server. " + error)
        }
    }

    register_api_callback(cmd: string, callback: Function): void {
        this.app.on_event("scrutiny.api.rx." + cmd, function (e) {
            callback(e.obj)
        })
    }

    // =====
    receive_watchable_list(data: API.Message.S2C.GetWatchableList): void {
        const reqid = data["reqid"]
        let download_type: WatchableDownloadType | null = null

        if (
            this.active_download_session[WatchableDownloadType.Var_Alias] !== null &&
            this.active_download_session[WatchableDownloadType.Var_Alias].reqid == reqid
        ) {
            download_type = WatchableDownloadType.Var_Alias
        } else if (
            this.active_download_session[WatchableDownloadType.RPV] !== null &&
            this.active_download_session[WatchableDownloadType.RPV].reqid == reqid
        ) {
            download_type = WatchableDownloadType.RPV
        } else {
            return
        }

        const download_session = this.active_download_session[download_type]
        if (download_session == null || download_session.is_canceled()) {
            return
        }

        try {
            if (this.server_status != ServerStatus.Connected) {
                download_session.cancel()
            } else if (this.device_status != DeviceStatus.Connected) {
                download_session.cancel()
            } else {
                if (download_type == WatchableDownloadType.Var_Alias) {
                    const required_size_var = download_session.get_required_datastore_size(DatastoreEntryType.Var)
                    const required_size_alias = download_session.get_required_datastore_size(DatastoreEntryType.Alias)

                    if (required_size_var == null || required_size_alias == null) {
                        download_session.cancel()
                    } else {
                        for (let i = 0; i < data["content"]["var"].length; i++) {
                            this.datastore.add_from_server_def(DatastoreEntryType.Var, data["content"]["var"][i])
                        }

                        for (let i = 0; i < data["content"]["alias"].length; i++) {
                            this.datastore.add_from_server_def(DatastoreEntryType.Alias, data["content"]["alias"][i])
                        }

                        if (
                            this.datastore.get_count(DatastoreEntryType.Alias) == required_size_alias &&
                            this.datastore.get_count(DatastoreEntryType.Var) == required_size_var
                        ) {
                            this.datastore.set_ready(DatastoreEntryType.Var)
                            this.datastore.set_ready(DatastoreEntryType.Alias)
                        } else if (
                            this.datastore.get_count(DatastoreEntryType.Var) > required_size_var ||
                            this.datastore.get_count(DatastoreEntryType.Alias) > required_size_alias
                        ) {
                            download_session.cancel()
                            this.logger.error("Server gave more data than expected. Downlaod type = " + download_type)
                        }
                    }
                }

                if (download_type == WatchableDownloadType.RPV) {
                    const required_size_rpv = download_session.get_required_datastore_size(DatastoreEntryType.RPV)
                    if (required_size_rpv == null) {
                        download_session.cancel()
                    } else {
                        for (let i = 0; i < data["content"]["rpv"].length; i++) {
                            this.datastore.add_from_server_def(DatastoreEntryType.RPV, data["content"]["rpv"][i])
                        }

                        if (this.datastore.get_count(DatastoreEntryType.RPV) == required_size_rpv) {
                            this.datastore.set_ready(DatastoreEntryType.RPV)
                        } else if (this.datastore.get_count(DatastoreEntryType.RPV) > required_size_rpv) {
                            download_session.cancel()
                            this.logger.error("Server gave more data than expected. Downlaod type = " + download_type)
                        }
                    }
                }
            }

            if (download_session.is_canceled()) {
                this.active_download_session[download_type] = null
            }
        } catch (e: any) {
            this.logger.error(e, e)
            download_session.cancel()
        }
    }

    inform_server_status_callback(data: API.Message.S2C.InformServerStatus) {
        const device_status_str_to_enum: Record<API.ServerDeviceStatus, DeviceStatus> = {
            unknown: DeviceStatus.NA,
            disconnected: DeviceStatus.Disconnected,
            connecting: DeviceStatus.Connecting,
            connected: DeviceStatus.Connecting,
            connected_ready: DeviceStatus.Connected,
        }

        try {
            try {
                const new_device_status = device_status_str_to_enum[data.device_status]
                if (new_device_status != this.device_status) {
                    if (new_device_status == DeviceStatus.Connected) {
                        this.app.trigger_event("scrutiny.device.connected")
                    } else if (this.device_status == DeviceStatus.Connected) {
                        this.app.trigger_event("scrutiny.device.disconnected")
                    }
                }

                this.device_status = new_device_status
            } catch (e: any) {
                this.device_status = DeviceStatus.NA
                this.logger.error("[inform_server_status] Received a bad device status")
                this.logger.debug(e)
            }

            try {
                let raise_event = false
                if (data["loaded_sfd"] == null && this.loaded_sfd != null) {
                    this.app.trigger_event("scrutiny.sfd.unloaded")
                } else if (data["loaded_sfd"] != null) {
                    let must_reload = false
                    if (this.loaded_sfd == null) {
                        must_reload = true
                    } else if (this.loaded_sfd["firmware_id"] != data["loaded_sfd"]["firmware_id"]) {
                        must_reload = true
                    }

                    if (must_reload) {
                        raise_event = true
                    }
                }

                this.loaded_sfd = data["loaded_sfd"]
                if (raise_event) {
                    this.app.trigger_event("scrutiny.sfd.loaded", { sfd: data["loaded_sfd"] })
                }
            } catch (e) {
                this.loaded_sfd = null
                this.logger.error("[inform_server_status] Cannot read loaded firmware. " + e)
            }

            try {
                this.device_info = data["device_info"]
            } catch (e) {
                this.device_info = null
                this.logger.error("[inform_server_status] Cannot read device info. " + e)
            }
        } catch (e) {
            this.logger.error("[inform_server_status] Unexpected error. " + e)
        }

        this.update_ui()
    }

    receive_watchable_update(data: API.Message.S2C.WatchableUpdate) {
        try {
            const updates = data["updates"]
            for (let i = 0; i < updates.length; i++) {
                const server_id = updates[i].id
                const value = updates[i].value

                try {
                    this.datastore.set_value_from_server_id(server_id, value)
                } catch (e) {
                    this.logger.log(`Cannot update value of entry with server ID ${server_id}. ` + e)
                }
            }
        } catch (e) {
            this.logger.error("[receive_watchable_update] Received a bad update list. " + e)
        }
    }
}
