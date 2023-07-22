//    server_connection.ts
//        Handles the communication with the server
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { DeviceStatus, ServerStatus, DataloggerState } from "../scrutiny/global_definitions"

import { Logger } from "./logging"
import { Datastore, DatastoreEntryType, AllDatastoreEntryTypes } from "./datastore"
import * as API from "./server_api"
import { listenHandle, triggerHandle } from "./types"

enum WatchableDownloadType {
    RPV = "rpv",
    Var_Alias = "var_alias",
}

/**
 * This class represents the operation of downloading watchables form the server.
 * It keeps tracks of each chunk of data and tells if all data has been received.
 */
class LoadWatchableSession {
    /** The request ID used by the ServerConnection t keep track of the initial request. Ensure that response are meant for this session */
    reqid: number

    /** The type of download. We can either download RuntimePublishedValues on device connect or Var and Alias on Firmware loading */
    download_type: WatchableDownloadType

    /** Indicates if that session is canceled */
    canceled: boolean

    /** A map of expected watchable count per type */
    expected_datastore_size: Record<DatastoreEntryType, number | null>

    /**
     *
     * @param reqid The request ID of the request that initiated the session
     * @param download_type The type of downlaod session (RPV only or Var/Alias)
     */
    constructor(reqid: number, download_type: WatchableDownloadType) {
        this.reqid = reqid
        this.download_type = download_type
        this.canceled = false

        this.expected_datastore_size = {} as typeof this.expected_datastore_size
        for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
            this.expected_datastore_size[AllDatastoreEntryTypes[i]] = null
        }
    }

    /**
     * Tells if the session has been canceled
     * @returns True if canceled
     */
    is_canceled(): boolean {
        return this.canceled
    }

    /**
     * Sets the number of expected watchables to be received by the server for each types relevant for this session
     * @param sizes_per_types The expected number of watchables
     */
    set_expected_datastore_size(sizes_per_types: Record<DatastoreEntryType, number>): void {
        if (this.download_type === WatchableDownloadType.RPV) {
            if (!sizes_per_types.hasOwnProperty(DatastoreEntryType.RPV)) {
                this.cancel()
                throw new Error("Expected number of RPV is expected")
            }
        } else if (this.download_type === WatchableDownloadType.Var_Alias) {
            if (!sizes_per_types.hasOwnProperty(DatastoreEntryType.Var) || !sizes_per_types.hasOwnProperty(DatastoreEntryType.Alias)) {
                this.cancel()
                throw new Error("Expected number of Var and Alias is expected")
            }
        }

        for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
            if (sizes_per_types.hasOwnProperty(AllDatastoreEntryTypes[i])) {
                this.expected_datastore_size[AllDatastoreEntryTypes[i]] = sizes_per_types[AllDatastoreEntryTypes[i]]
            }
        }
    }

    /**
     * Returns the number of watchables that we are expecting for a given entry type in this session
     * @param entry_type Entry of the watchables
     * @returns Number of expected watchables
     */
    get_required_datastore_size(entry_type: DatastoreEntryType): number | null {
        if (entry_type === DatastoreEntryType.RPV && !(this.download_type === WatchableDownloadType.RPV)) {
            throw new Error('Entry type "RPV" not expected for this download')
        }
        if (entry_type === DatastoreEntryType.Alias && !(this.download_type === WatchableDownloadType.Var_Alias)) {
            throw new Error('Entry type "Alias" not expected for this download')
        }

        if (entry_type === DatastoreEntryType.Var && !(this.download_type === WatchableDownloadType.Var_Alias)) {
            throw new Error('Entry type "Var" not expected for this download')
        }

        return this.expected_datastore_size[entry_type]
    }

    /**
     * Mark the session as canceled, meaning we will have to start a new one to re-download data
     */
    cancel(): void {
        this.canceled = true
    }
}

/**
 * Handles the communication with the server
 */
export class ServerConnection {
    /** Server socket hostname */
    hostname: string
    /** Server socket port */
    port: number

    /** Interval at which the UI should be updated (milliseconds) */
    update_ui_interval: number
    /** Interval at which the app should try to reconnect to the server (milliseconds) */
    reconnect_interval: number
    /** The amount of time to wait for an answer from the server to a get_status request  before marking the server has disconnected */
    connect_timeout: number
    /** Interval at which we should request the server for its status (milliseconds) */

    /** The main logger object for this module */
    logger: Logger
    /** A dedicated logger object for communication debug */
    comm_logger: Logger
    /** The Application datastore used to store watchables and their values*/
    datastore: Datastore
    /** The websocket used to communicate with the server */
    socket: WebSocket | null
    /** The status of the server communication (connected/connecting/disconnected) */
    server_status: ServerStatus
    /** The status of the device communication (Connected/connecting/disconnected) */
    device_status: DeviceStatus
    /** The state of the datalogger in the device */
    datalogger_state: DataloggerState
    /** Completion ratio of the active acquisition after trigger*/
    datalogging_completion_ratio: number | null
    /** The device datalogging capabilities (buffer size, sampling rates, etc). Null if datalogging is not supported */
    datalogging_capabilities: API.Datalogging.Capabilities | null
    /** The actual Scrutiny Firmware Description file loaded by the server. null if none is loaded (no device connected or unknown firmware) */
    loaded_sfd: API.ScrutinyFirmwareDescription | null
    /** List of information broadcasted by the device upon connection */
    device_info: API.DeviceInformation | null
    /** Handle to cancel the periodic calls that sends a get_server_status request */
    get_status_timer_handle: ReturnType<typeof setTimeout> | null
    /** Allows server periodic reconnect if the server is disconnected. Stays passive otherwise */
    enable_reconnect: boolean
    /** List of all requests sent for which we are waiting a response. Use to keep track of request chaining */
    pending_request_queue: Record<
        number,
        {
            resolve: (val?: any) => void
            reject: (val?: any) => void
        }
    >
    /** Handle for the socket connection timeout timer  */
    connect_timeout_handle: ReturnType<typeof setTimeout> | null
    /** Handle on the reconnect delay timer */
    reconnect_timeout_handle: ReturnType<typeof setTimeout> | null
    /** Incrementing counter that gives a unique ID to each request */
    actual_request_id: number

    /** The watchable download session presently being active. Null if none is active*/
    active_download_session: Record<WatchableDownloadType, LoadWatchableSession | null>

    listen: listenHandle
    trigger: triggerHandle
    shutdownCallbacks: Array<{ (): void }>

    /**
     *
     * @param app The Scrutiny application instance
     * @param ui The User Interface instance
     * @param datastore The datastore instance used for watchable storage
     */
    constructor({
        datastore,
        getLogger,
        listen,
        trigger,
    }: {
        datastore: Datastore
        getLogger: { (name: string): Logger }
        listen: listenHandle
        trigger: triggerHandle
    }) {
        this.trigger = trigger
        this.shutdownCallbacks = []
        this.listen = (name, handle) => {
            const stop = listen(name, handle)
            this.shutdownCallbacks.push(stop)
            return stop
        }
        this.update_ui_interval = 500
        this.reconnect_interval = 500
        this.connect_timeout = 1500

        this.logger = getLogger("server-manager")
        this.comm_logger = getLogger("server-comm")
        this.datastore = datastore
        this.hostname = "localhost"
        this.port = 8765
        this.socket = null
        this.server_status = ServerStatus.Disconnected
        this.device_status = DeviceStatus.NA
        this.datalogger_state = DataloggerState.NA
        this.datalogging_completion_ratio = null
        this.loaded_sfd = null
        this.device_info = null
        this.datalogging_capabilities = null

        this.enable_reconnect = true
        this.connect_timeout_handle = null
        this.reconnect_timeout_handle = null

        this.get_status_timer_handle = null
        this.actual_request_id = 0
        this.pending_request_queue = {}
        this.active_download_session = {} as typeof this.active_download_session
        this.active_download_session[WatchableDownloadType.RPV] = null
        this.active_download_session[WatchableDownloadType.Var_Alias] = null

        this.set_server_disconnected()
        this.update_ui()
    }

    protected registerToEvents() {
        this.register_api_callback("inform_server_status", (data: API.Message.S2C.InformServerStatus) => {
            this.inform_server_status_callback(data)
        })

        this.register_api_callback("response_get_watchable_list", (data: API.Message.S2C.GetWatchableList) => {
            this.receive_watchable_list(data)
        })

        this.register_api_callback("watchable_update", (data: API.Message.S2C.WatchableUpdate) => {
            this.receive_watchable_update(data)
        })
        this.register_api_callback("get_datalogging_capabilities_response", (data: API.Message.S2C.GetDataloggingCapabilitiesResponse) => {
            this.receive_datalogging_capabilities(data)
        })

        this.listen("scrutiny.sfd.loaded", (data) => {
            this.reload_datastore_from_server(WatchableDownloadType.Var_Alias)
        })

        this.listen("scrutiny.device.connected", (e) => {
            this.reload_datastore_from_server(WatchableDownloadType.RPV)
        })

        this.listen("scrutiny.device.disconnected", (e) => {
            this.set_device_disconnected()
        })

        this.listen("scrutiny.sfd.unloaded", () => {
            this.datastore.clear([DatastoreEntryType.Alias, DatastoreEntryType.Var])
            this.cancel_watchable_download_if_any(WatchableDownloadType.Var_Alias)
        })

        this.listen("scrutiny.server.disconnected", () => {
            this.set_server_disconnected()
            this.datastore.clear()
        })

        // todo : agglomerate list
        this.listen("scrutiny.datastore.start_watching", (data) => {
            let params = {
                watchables: [data.entry.server_id],
            }

            this.send_request("subscribe_watchable", params)
        })

        // todo : agglomerate list
        this.listen("scrutiny.datastore.stop_watching", (data) => {
            let params = {
                watchables: [data.entry.server_id],
            }

            this.send_request("unsubscribe_watchable", params)
        })
    }

    /**
     * Cancel a watchable download session
     * @param download_type The type of watchable download to cancel
     */
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
    set_device_disconnected() {
        this.datastore.clear([DatastoreEntryType.RPV])
        this.cancel_watchable_download_if_any(WatchableDownloadType.RPV)
        this.cancel_watchable_download_if_any(WatchableDownloadType.Var_Alias)

        this.datalogger_state = DataloggerState.NA
        this.datalogging_completion_ratio = null

        if (this.datalogging_capabilities !== null) {
            this.datalogging_capabilities = null
            this.trigger("scrutiny.datalogging_capabilities_changed")
        }

        this.device_status = DeviceStatus.NA
        this.loaded_sfd = null
        this.device_info = null
    }

    /**
     * Put the connection handler in a disconnected state.
     */
    set_server_disconnected(): void {
        this.cancel_watchable_download_if_any(WatchableDownloadType.Var_Alias)
        this.cancel_watchable_download_if_any(WatchableDownloadType.RPV)
        this.set_device_disconnected()
        this.server_status = ServerStatus.Disconnected

        this.update_ui()
    }

    /**
     * Sets the endpoint for websocket that will reach the server
     * @param hostname Server hostname
     * @param port Server websocket port
     */
    set_endpoint(hostname: string, port: number): void {
        this.hostname = hostname
        this.port = port
    }

    /**
     * Reload the list of watchable from the server and populates the datastore. Will
     * send a get_watchable_list request to the server and start a download session where multiple response will
     * be received and aggregated together. The session will terminate when the last message is received.
     * @param download_type Type of data to download.
     */
    reload_datastore_from_server(download_type: WatchableDownloadType): void {
        if (download_type == null) {
            throw new Error("Missing download_type")
        }
        let download_params: Partial<API.Message.C2S.GetWatchableList> = {
            max_per_response: 1000,
        }
        download_params.filter = {}

        try {
            if (download_type === WatchableDownloadType.Var_Alias) {
                if (this.loaded_sfd === null) {
                    throw new Error("Cannot process watchable list, no SFD loaded")
                }

                this.datastore.clear([DatastoreEntryType.Alias, DatastoreEntryType.Var])
                download_params.filter.type = ["alias", "var"]
            } else if (download_type === WatchableDownloadType.RPV) {
                this.datastore.clear([DatastoreEntryType.RPV])
                download_params.filter.type = ["rpv"]
            } else {
                throw new Error("Unsupported download type " + download_type)
            }
        } catch (e: any) {
            this.logger.error(e, e)
            this.cancel_watchable_download_if_any(download_type) // This accepts garbage an won't throw
            return
        }
        this.chain_request("get_watchable_count").then(
            (data) => {
                const reqid = this.send_request("get_watchable_list", download_params)
                if (reqid == null) {
                    return
                }
                const new_session = new LoadWatchableSession(reqid, download_type)

                let expected_size = {} as Record<DatastoreEntryType, number>
                expected_size[DatastoreEntryType.Var] = data["qty"]["var"]
                expected_size[DatastoreEntryType.Alias] = data["qty"]["alias"]
                expected_size[DatastoreEntryType.RPV] = data["qty"]["rpv"]
                new_session.set_expected_datastore_size(expected_size)
                this.active_download_session[download_type] = new_session
            },
            (data) => {
                this.cancel_watchable_download_if_any(download_type)
            }
        )
    }

    /**
     * Starts the server communication. Tries to connect to the server and launch periodic polling
     */
    start(): void {
        this.registerToEvents()
        this.enable_reconnect = true
        this.create_socket()
        this.server_status = ServerStatus.Connecting

        setInterval(() => {
            this.update_ui()
        }, this.update_ui_interval)

        this.update_ui()
    }

    /**
     * Stops the server communication. Will stops periodic messages, close the socket and go in "disconnected" state
     */
    stop(): void {
        this.enable_reconnect = false
        this.close_socket()

        if (this.server_status === ServerStatus.Connected) {
            this.trigger("scrutiny.server.disconnected")
        }

        for (const handle of this.shutdownCallbacks) handle()
    }

    /**
     * Sends a request to the server through a websocket
     * @param cmd API request name
     * @param params Object to serialize in JSON to attach to the request
     * @returns A unique request ID. null if the request can't be sent
     */
    send_request(cmd: string, params: any = {}): number | null {
        let reqid: number | null = null
        if (this.socket !== null) {
            if (this.socket.readyState === this.socket.OPEN) {
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

    /**
     * Allow to chain request asynchronously using Javascript Promises
     * @param cmd Request name to send
     * @param params Data to attach with the request
     * @returns A Promise that will be resolved when the request completes.
     */
    chain_request(cmd: string, params: any = {}, timeout = 2000): Promise<any> {
        const reqid = this.send_request(cmd, params)

        return new Promise((resolve, reject) => {
            if (reqid != null) {
                this.pending_request_queue[reqid] = {
                    resolve: resolve,
                    reject: reject,
                }

                setTimeout(() => {
                    // Reject the Promise and delete it
                    reject(new Error("Request timed out"))
                    if (this.pending_request_queue.hasOwnProperty(reqid)) {
                        delete this.pending_request_queue[reqid]
                    }
                }, timeout)
            } else {
                reject(new Error("Could not send the request")) // Could not send the request
            }
        })
    }

    /**
     * Creates the websocket and attach all the callbacks
     */
    create_socket(): void {
        this.close_socket()

        this.reconnect_timeout_handle = null
        this.socket = new WebSocket("ws://" + this.hostname + ":" + this.port)
        this.socket.onmessage = (e) => {
            this.on_socket_message_callback(e.data)
        }
        this.socket.onclose = (e) => {
            this.on_socket_close_callback(e)
        }
        this.socket.onopen = (e) => {
            this.on_socket_open_callback(e)
        }
        this.socket.onerror = (e) => {
            this.on_socket_error_callback(e)
        }

        this.connect_timeout_handle = setTimeout(() => {
            if (this.socket !== null) {
                if (this.socket.readyState != this.socket.OPEN) {
                    this.close_socket()
                }
            }
        }, this.connect_timeout)
    }

    close_socket() {
        if (this.socket !== null) {
            this.logger.debug("Destroying socket")
            this.socket.close()
            this.socket = null
        }
    }

    /**
     * Starts a timer that will poll the server for its status
     */
    request_server_status_and_keep_going(): void {
        this.stop_get_status_periodic_call()
        this.chain_request("get_server_status")
            .finally(() => {
                this.get_status_timer_handle = setTimeout(() => {
                    this.request_server_status_and_keep_going()
                }, this.get_status_interval_ms())
            })
            .catch((e) => {
                this.logger.error("Failed to get the server status. " + e.message)
            })
    }

    get_status_interval_ms(): number {
        if (this.datalogger_state !== null) {
            if (this.datalogger_state == DataloggerState.Acquiring) {
                return 500
            }
        }

        return 1500
    }

    /**
     * Stops the server polling
     */
    stop_get_status_periodic_call(): void {
        if (this.get_status_timer_handle !== null) {
            clearTimeout(this.get_status_timer_handle)
            this.get_status_timer_handle = null
        }
    }

    /**
     * Triggers event to update statuses, if it changed since the last call
     */
    protected lastUiStatus: null | string = null
    update_ui(): void {
        const status = {
            server: { status: this.server_status },
            device: {
                status: this.device_status,
                info: this.device_info,
                datalogging_capabilities: this.datalogging_capabilities,
            },
            dataloging: {
                state: this.datalogger_state,
                completion_ratio: this.datalogging_completion_ratio,
            },
            loaded_sfd: this.loaded_sfd,
        }
        const newStatus = JSON.stringify(status)
        if (newStatus !== this.lastUiStatus) {
            this.lastUiStatus = newStatus
            this.trigger("scrutiny.ui.status", status)
        }
    }

    /**
     * Stop the timeout Timer that would have declared a connection attempt as a failure
     */
    clear_connect_timeout(): void {
        if (this.connect_timeout_handle != null) {
            clearTimeout(this.connect_timeout_handle)
            this.connect_timeout_handle = null
        }
    }

    /**
     * Callback called when the websocket is closed
     * @param e Close event
     */
    on_socket_close_callback(e: CloseEvent): void {
        const must_trigger_disconnected_event = this.server_status === ServerStatus.Connected

        this.set_server_disconnected()
        this.clear_connect_timeout()
        this.stop_get_status_periodic_call()

        if (must_trigger_disconnected_event) {
            this.trigger("scrutiny.server.disconnected")
        }

        if (this.socket !== null) {
            this.socket = null
        }

        if (this.enable_reconnect) {
            this.try_reconnect(this.reconnect_interval)
        }
    }

    /**
     * Callback called when the websocket is opened
     * @param e Javascript event
     */
    on_socket_open_callback(e: Event): void {
        this.server_status = ServerStatus.Connected
        this.device_status = DeviceStatus.NA
        this.update_ui()
        this.clear_connect_timeout()

        this.request_server_status_and_keep_going()

        this.trigger("scrutiny.server.connected")
    }

    /**
     * Callback called when the socket encounters an error (like getting reset on connect)
     * @param e Javascript event
     */
    on_socket_error_callback(e: Event): void {
        const must_trigger_disconnected_event = this.server_status === ServerStatus.Connected

        this.set_server_disconnected()
        this.clear_connect_timeout()
        this.stop_get_status_periodic_call()

        if (must_trigger_disconnected_event) {
            this.trigger("scrutiny.server.disconnected")
        }

        this.close_socket()

        if (this.enable_reconnect) {
            this.try_reconnect(this.reconnect_interval)
        }
    }

    /**
     * Schedule a reconnect operation in the specified delay
     * @param delay_ms The reconnection delay
     */
    try_reconnect(delay_ms: number): void {
        if (this.reconnect_timeout_handle == null) {
            this.reconnect_timeout_handle = setTimeout(() => {
                this.create_socket()
            }, delay_ms)
        }
    }

    /**
     * Callback called when a message is received through the websocket
     * @param msg The message received
     */
    on_socket_message_callback(msg: string): void {
        try {
            this.comm_logger.debug("Received: " + msg)
            const obj = JSON.parse(msg)

            // Server is angry. Try to understand why
            if (obj.cmd === "error") {
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

                this.trigger("scrutiny.api.rx." + obj.cmd, { obj: obj })

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

    /**
     * Register a callback to call when a message is received from the server. This callback will be tied to a specific message
     * and will be called only when this message will be received. Multiple callback can be registered for a same message
     * @param cmd The message command name to listen for
     * @param callback Callback to call when a response is received
     */
    register_api_callback(cmd: string, callback: Function): void {
        this.listen("scrutiny.api.rx." + cmd, function (e) {
            callback(e.obj)
        })
    }

    /**
     * Handles the reception of a GetWatchableList response message that contains
     * a subset of all watchables available in the server
     * @param data Message data
     */
    receive_watchable_list(data: API.Message.S2C.GetWatchableList): void {
        const reqid = data["reqid"]
        if (reqid === null) {
            throw new Error("List of watchable had no reqid echo")
        }

        let download_type: WatchableDownloadType | null = null

        const var_alias_session = this.active_download_session[WatchableDownloadType.Var_Alias]
        const rpv_session = this.active_download_session[WatchableDownloadType.RPV]
        if (var_alias_session !== null && var_alias_session.reqid === reqid) {
            download_type = WatchableDownloadType.Var_Alias
        } else if (rpv_session !== null && rpv_session.reqid === reqid) {
            download_type = WatchableDownloadType.RPV
        } else {
            return
        }

        const download_session = this.active_download_session[download_type]
        if (download_session == null || download_session.is_canceled()) {
            return
        }

        try {
            if (this.server_status !== ServerStatus.Connected) {
                download_session.cancel()
            } else if (this.device_status !== DeviceStatus.Connected) {
                download_session.cancel()
            } else {
                if (download_type === WatchableDownloadType.Var_Alias) {
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
                            this.datastore.get_count(DatastoreEntryType.Alias) === required_size_alias &&
                            this.datastore.get_count(DatastoreEntryType.Var) === required_size_var
                        ) {
                            this.datastore.set_ready(DatastoreEntryType.Var)
                            this.datastore.set_ready(DatastoreEntryType.Alias)
                        } else if (
                            this.datastore.get_count(DatastoreEntryType.Var) > required_size_var ||
                            this.datastore.get_count(DatastoreEntryType.Alias) > required_size_alias
                        ) {
                            download_session.cancel()
                            this.logger.error("Server gave more data than expected. Download type = " + download_type)
                        }
                    }
                }

                if (download_type === WatchableDownloadType.RPV) {
                    const required_size_rpv = download_session.get_required_datastore_size(DatastoreEntryType.RPV)
                    if (required_size_rpv == null) {
                        download_session.cancel()
                    } else {
                        for (let i = 0; i < data["content"]["rpv"].length; i++) {
                            this.datastore.add_from_server_def(DatastoreEntryType.RPV, data["content"]["rpv"][i])
                        }

                        if (this.datastore.get_count(DatastoreEntryType.RPV) === required_size_rpv) {
                            this.datastore.set_ready(DatastoreEntryType.RPV)
                        } else if (this.datastore.get_count(DatastoreEntryType.RPV) > required_size_rpv) {
                            download_session.cancel()
                            this.logger.error("Server gave more data than expected. Download type = " + download_type)
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

    /**
     * Handles the reception of a inform_status message that contains the actual state of the server
     * @param data The message data
     */
    inform_server_status_callback(data: API.Message.S2C.InformServerStatus) {
        const device_status_str_to_enum: Record<API.ServerDeviceStatus, DeviceStatus> = {
            unknown: DeviceStatus.NA,
            disconnected: DeviceStatus.Disconnected,
            connecting: DeviceStatus.Connecting,
            connected: DeviceStatus.Connecting,
            connected_ready: DeviceStatus.Connected,
        }

        const datalogging_state_str_to_enum: Record<API.Datalogging.DataloggerState, DataloggerState> = {
            unavailable: DataloggerState.NA,
            standby: DataloggerState.Standby,
            acquiring: DataloggerState.Acquiring,
            data_ready: DataloggerState.DataReady,
            waiting_for_trigger: DataloggerState.WaitForTrigger,
            error: DataloggerState.Error,
        }

        try {
            try {
                const new_device_status = device_status_str_to_enum[data.device_status]
                if (new_device_status !== this.device_status) {
                    if (new_device_status === DeviceStatus.Connected) {
                        this.trigger("scrutiny.device.connected")
                    } else if (this.device_status === DeviceStatus.Connected) {
                        this.trigger("scrutiny.device.disconnected")
                    }
                }

                this.device_status = new_device_status
            } catch (e: any) {
                this.device_status = DeviceStatus.NA
                this.logger.error("[inform_server_status] Received a bad device status")
                this.logger.debug(e)
            }

            try {
                let raise_event = false // raise scrutiny.sfd.loaded event
                if (data["loaded_sfd"] == null && this.loaded_sfd != null) {
                    this.trigger("scrutiny.sfd.unloaded")
                } else if (data["loaded_sfd"] != null) {
                    let must_reload = false
                    if (this.loaded_sfd == null) {
                        must_reload = true
                    } else if (this.loaded_sfd["firmware_id"] !== data["loaded_sfd"]["firmware_id"]) {
                        must_reload = true
                    }

                    if (must_reload) {
                        raise_event = true
                    }
                }

                this.loaded_sfd = data["loaded_sfd"]
                if (raise_event) {
                    this.trigger("scrutiny.sfd.loaded", {
                        sfd: data["loaded_sfd"],
                    })
                }
            } catch (e) {
                this.loaded_sfd = null
                this.logger.error("[inform_server_status] Cannot read loaded firmware. ", e)
            }

            try {
                const new_datalogger_state = datalogging_state_str_to_enum[data.device_datalogging_status.datalogger_state]
                if (new_datalogger_state !== this.datalogger_state) {
                    this.trigger("scrutiny.datalogging.status_changed", new_datalogger_state)

                    if (new_datalogger_state === DataloggerState.DataReady) {
                        this.trigger("scrutiny.datalogging.data_ready")
                    } else if (this.datalogger_state === DataloggerState.Acquiring) {
                        this.trigger("scrutiny.datalogging.acquisition_started")
                    } else if (this.datalogger_state === DataloggerState.Error) {
                        this.trigger("scrutiny.datalogging.error")
                    }
                }

                this.datalogger_state = new_datalogger_state
                this.datalogging_completion_ratio = data.device_datalogging_status.completion_ratio
            } catch (e) {
                this.datalogger_state = DataloggerState.NA
                this.logger.error("[inform_server_status] Received a bad datalogging status", e)
            }

            try {
                this.device_info = data["device_info"]
                if (this.device_info !== null) {
                    if (this.device_info.supported_feature_map.datalogging) {
                        if (this.datalogging_capabilities == null) {
                            this.send_request("get_datalogging_capabilities")
                        }
                    }
                }
            } catch (e) {
                this.device_info = null
                this.logger.error("[inform_server_status] Cannot read device info. ", e)
            }
        } catch (e) {
            this.logger.error("[inform_server_status] Unexpected error. ", e)
        }

        this.update_ui()
    }

    /**
     * Handles the reception of a watchable_update message containing new values for the watchables
     * to be written in the datastore.
     * @param data The message data containing the watchables values
     */
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
            this.logger.error("[receive_watchable_update] Received a bad update list.", e)
        }
    }

    receive_datalogging_capabilities(data: API.Message.S2C.GetDataloggingCapabilitiesResponse) {
        try {
            this.datalogging_capabilities = null
            if (data["available"]) {
                if (data["capabilities"] !== null) {
                    this.datalogging_capabilities = data["capabilities"]
                }
            }

            this.trigger("scrutiny.datalogging_capabilities_changed", this.datalogging_capabilities)
        } catch (e) {
            this.logger.error("[get_datalogging_capabilities_response] Received a bad datalogging capabilities.", e)
        }
    }
}
