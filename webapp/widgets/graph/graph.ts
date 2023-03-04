import { BaseWidget } from "@src/base_widget"
import { App } from "@src/app"
import * as logging from "@src/logging"
import { default as $ } from "@jquery"
import { number2str, trim, force_input_int, force_input_float } from "@src/tools"
import * as API from "@src/server_api"
import { configure_all_tooltips } from "@src/ui"
import { CLASS_LIVE_EDIT_CONTENT, JQueryLiveEdit } from "@scrutiny-live-edit"
import { WatchableInterface } from "@src/widgets/common"
import { Chart, ChartConfiguration, ChartDataset } from "chart.js/auto"

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    TransferScope,
    TransferPolicy,
    TransferFunctionMetadata,
    TransferFunctionOutput,
} from "@scrutiny-treetable"
import { scrutiny_resizable_table, PluginOptions as ResizableTableOptions } from "@scrutiny-resizable-table"

const CLASS_AXIS_ROW = "axis"
const CLASS_INPUT_ERROR = "input-error"
const CLASS_ERROR_MSG = "error-msg"

const MIN_DECIMATION = 1
const MAX_DECIMATION = 0xffff
const MIN_PROBE_LOCATION = 0
const MAX_PROBE_LOCATION = 100
const MIN_TIMEOUT_SEC = 0
const MAX_TIMEOUT_SEC = 420 // 2^32/1e7 = 429.49;  Make it round to 7 minutes
const MIN_HOLD_TIME_MS = 0
const MAX_HOLD_TIME_MS = 420 * 1000

const NB_OPERANDS_MAP: Record<API.Datalogging.TriggerType, number> = {
    true: 0,
    eq: 2,
    neq: 2,
    lt: 2,
    let: 2,
    gt: 2,
    get: 2,
    cmt: 2,
    within: 3,
}

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

$.extend($.fn, {
    enable: function () {
        return this.removeAttr("disabled")
    },
    disable: function () {
        return this.attr("disabled", "disabled")
    },
})

type JQueryTable = JQuery<HTMLTableElement>
type JQueryRow = JQuery<HTMLTableRowElement>

interface ScrutinyResizableTable extends JQuery<HTMLTableElement> {
    scrutiny_resizable_table: Function
}
interface ScrutinyTreeTable extends ScrutinyResizableTable {
    scrutiny_treetable: Function
}

interface JQueryDisableable<T> extends JQuery<T> {
    enable: Function
    disable: Function
}

interface SignalTableConfig {
    yaxis: API.Datalogging.AxisDef[]
    signals: {
        row: JQueryRow
        axis_id: number
    }[]
}

export class GraphWidget extends BaseWidget {
    container: JQuery
    /** The Scrutiny App instance */
    app: App
    /** The instance ID of this widget. */
    instance_id: number
    /** Logger element */
    logger: logging.Logger

    next_axis_id: number

    waiting_on_acquisition: boolean
    pending_acquisition_token: string | null = null

    layout_content_div: JQuery<HTMLDivElement>
    graph_config_div: JQuery<HTMLDivElement>
    graph_display_div: JQuery<HTMLDivElement>
    graph_broswer_div: JQuery<HTMLDivElement>
    button_configure: JQueryDisableable<HTMLButtonElement>
    button_acquire: JQueryDisableable<HTMLButtonElement>
    button_browse: JQueryDisableable<HTMLButtonElement>
    button_graph: JQueryDisableable<HTMLButtonElement>

    chart: Chart | null

    /**
     *
     * @param container HTML container object in which to append the widget content
     * @param app The Scrutiny App instance
     * @param instance_id A unique instance number for this widget
     */
    constructor(container: JQuery<HTMLDivElement>, app: App, instance_id: number) {
        super(container, app, instance_id)
        this.container = container
        this.app = app
        this.instance_id = instance_id

        this.logger = logging.getLogger(this.constructor.name)
        this.next_axis_id = 1
        this.layout_content_div = null as unknown as JQuery<HTMLDivElement>
        this.graph_config_div = null as unknown as JQuery<HTMLDivElement>
        this.graph_display_div = null as unknown as JQuery<HTMLDivElement>
        this.graph_broswer_div = null as unknown as JQuery<HTMLDivElement>
        this.button_configure = null as unknown as JQueryDisableable<HTMLButtonElement>
        this.button_acquire = null as unknown as JQueryDisableable<HTMLButtonElement>
        this.button_browse = null as unknown as JQueryDisableable<HTMLButtonElement>
        this.button_graph = null as unknown as JQueryDisableable<HTMLButtonElement>
        this.chart = null

        this.waiting_on_acquisition = false
        this.pending_acquisition_token = null
    }

    /**
     * Initialize the widget
     */
    initialize() {
        const that = this
        const layout = this.app.get_template(this, "layout") as JQuery<HTMLDivElement>
        this.layout_content_div = layout.find(".layout-content") as JQueryDisableable<HTMLDivElement>
        this.button_configure = layout.find("button.btn-configure").first() as JQueryDisableable<HTMLButtonElement>
        this.button_acquire = layout.find("button.btn-acquire").first() as JQueryDisableable<HTMLButtonElement>
        this.button_browse = layout.find("button.btn-browse").first() as JQueryDisableable<HTMLButtonElement>
        this.button_graph = layout.find("button.btn-graph").first() as JQueryDisableable<HTMLButtonElement>
        this.graph_config_div = layout.find(".graph-config") as JQuery<HTMLDivElement>
        this.graph_display_div = layout.find(".graph-display") as JQuery<HTMLDivElement>
        this.graph_broswer_div = layout.find(".graph-browser") as JQuery<HTMLDivElement>
        const config_form_pane = this.app.get_template(this, "config_form_pane") as JQuery<HTMLDivElement>
        const signal_list_pane = this.app.get_template(this, "signal_list_pane") as JQuery<HTMLDivElement>
        this.graph_config_div.find(".pane-left").append(signal_list_pane)
        this.graph_config_div.find(".pane-right").append(config_form_pane)
        this.container.append(layout)
        this.update_config_capabilities()

        this.app.on_event("scrutiny.datalogging_capabilities_changed", function () {
            that.update_config_capabilities()
        })

        this.app.on_event("scrutiny.device.disconnected", function () {
            that.update_config_capabilities()
        })

        const config_table = this.get_config_table()

        config_table.find("select").on("change", function () {
            that.update_config_form()
        })

        config_table.find("input").on("change", function () {
            that.update_config_form()
        })

        config_table.find("input").on("blur", function () {
            that.update_config_form()
        })

        this.get_decimation_input().on("change", function () {
            force_input_int($(this), MIN_DECIMATION, MAX_DECIMATION)
            that.update_config_form()
        })

        this.get_probe_location_input().on("change", function () {
            force_input_int($(this), MIN_PROBE_LOCATION, MAX_PROBE_LOCATION)
            that.update_config_form()
        })

        this.get_timeout_input().on("change", function () {
            force_input_float($(this), MIN_TIMEOUT_SEC, MAX_TIMEOUT_SEC)
            that.update_config_form()
        })

        this.get_hold_time_input().on("change", function () {
            force_input_float($(this), MIN_HOLD_TIME_MS, MAX_HOLD_TIME_MS)
            that.update_config_form()
        })

        configure_all_tooltips(config_table)

        const split_table = this.container.find("table.split-pane") as ScrutinyResizableTable
        split_table.scrutiny_resizable_table({
            table_width_constrained: true,
            nowrap: false,
        } as ResizableTableOptions)

        const signal_list_table = signal_list_pane.find("table.signal-list") as ScrutinyTreeTable
        signal_list_table.attr("id", "graph-signal-list-" + this.instance_id)

        const tree_table_config: TreeTableOptions = {
            draggable: true,
            droppable: true,
            allow_delete: true,
            move_allowed_fn: function (tr: JQueryRow, node_id: string, new_parent_id: string | null, after_node_id: string | null) {
                if (new_parent_id == null) {
                    // Do not allow to move to a root node (axis are root nodes.)
                    return false
                }
                return true
            },
            col_index: 1,
            transfer_policy_fn: function (
                source_table: JQueryTable,
                dest_table: JQueryTable,
                tr: JQuery,
                new_parent_id: string | null,
                after_node_id: string | null
            ): TransferPolicy {
                if (new_parent_id == null) {
                    // Root node are reserved to axis
                    return { scope: TransferScope.NONE }
                }

                if (WatchableInterface.is_entry_row(tr as JQueryRow)) {
                    return { scope: TransferScope.ROW_ONLY }
                }

                return { scope: TransferScope.NONE }
            },
            load_fn: function (node_id, tr) {
                return []
            },
            transfer_fn: function (
                source_table: JQueryTable,
                bare_line: JQueryRow,
                meta: TransferFunctionMetadata
            ): TransferFunctionOutput {
                try {
                    const text_name = WatchableInterface.get_name_cell(bare_line).text()
                    const entry = WatchableInterface.get_entry_from_row(that.app.datastore, bare_line)
                    if (entry === null) {
                        that.logger.error("Failed to transfer row. Entry not found in " + bare_line)
                        return null
                    }

                    const row_desc = WatchableInterface.make_entry_row(entry, text_name, false, false)
                    row_desc.td_name.live_edit()
                    return { tr: row_desc.tr }
                } catch (e) {
                    that.logger.error("Failed to transfer row. Entry not found in " + bare_line)
                    return null
                }
            },
            keydown_callback: function (e: JQuery.KeyDownEvent, selected_rows: JQueryRow) {
                const first_row = selected_rows.first()
                if (e.key == "F2") {
                    if (selected_rows.length > 1) {
                        signal_list_table.scrutiny_treetable("select_node", first_row)
                    }

                    let td: JQueryLiveEdit<HTMLTableCellElement> | null = null

                    if (WatchableInterface.is_entry_row(selected_rows)) {
                        td = WatchableInterface.get_name_cell(first_row)
                    } else if (first_row.hasClass(CLASS_AXIS_ROW)) {
                        td = first_row.children("td:first") as JQueryLiveEdit<HTMLTableCellElement>
                    }
                    if (td !== null) {
                        if (td.live_edit("is_label_mode")) {
                            td.live_edit("edit_mode")
                        }
                    }
                }
            },
        }

        signal_list_table.scrutiny_treetable(tree_table_config)

        signal_list_pane.find(".btn-add-axis").on("click", function () {
            that.add_axis()
        })

        this.add_axis()
        this.switch_to_config()

        this.button_configure.on("click", function () {
            that.switch_to_config()
        })

        this.button_graph.on("click", function () {
            that.switch_to_graph()
        })

        this.button_browse.on("click", function () {
            that.switch_to_browser()
        })

        this.button_acquire.on("click", function () {
            const req = that.validate_config_and_make_request() // Mark the bad configs on the UI
            if (req !== null) {
                that.waiting_on_acquisition = true
                that.pending_acquisition_token = null
                that.logger.debug("Requesting datalogging acquisition")
                that.app.server_conn.send_request("request_datalogging_acquisition", req)
                that.switch_to_graph()
            } else {
                that.switch_to_config()
            }
        })

        this.app.server_conn.register_api_callback(
            "request_datalogging_acquisition_response",
            function (data: API.Message.S2C.RequestDataloggingAcquisition) {
                if (that.waiting_on_acquisition) {
                    that.logger.debug(`Received acquisition request aknowledgement with token ${data.request_token}`)
                    that.pending_acquisition_token = data.request_token
                } else {
                    that.logger.error("Received a datalogging acquisition confirmation but none was expected")
                }
            }
        )

        this.app.server_conn.register_api_callback(
            "inform_datalogging_acquisition_complete",
            function (data: API.Message.S2C.InformDataloggingAcquisitionComplete) {
                if (!that.waiting_on_acquisition) {
                    that.logger.debug("Acquisition completed, but was not waiting for it")
                    that.stop_waiting_for_acquisition()
                    return
                }

                if (that.pending_acquisition_token == null) {
                    that.logger.error("Received a confirmation of datalogging completion, but no request token was being waited for")
                    that.stop_waiting_for_acquisition()
                    return
                }

                if (that.pending_acquisition_token != data.request_token) {
                    that.logger.debug("Acquisition completed, but was not mine")
                    that.stop_waiting_for_acquisition()
                    return
                }

                if (data.success) {
                    if (data.reference_id !== null) {
                        that.logger.debug(
                            `Datalogging acquisition complete. Request token=${data.request_token}). Acquisition reference ID=${data.reference_id}`
                        )
                        that.request_load_acquisition_data(data.reference_id)
                    } else {
                        that.logger.error("Server did not provide a reference id for datalogging acquisition")
                    }
                } else {
                    // todo : Add visual feedback
                    that.logger.error("Datalogging acquisition failed to complete")
                }

                that.stop_waiting_for_acquisition()
            }
        )

        this.app.server_conn.register_api_callback(
            "read_datalogging_acquisition_content_response",
            function (data: API.Message.S2C.ReadDataloggingAcquisitionContent) {
                that.show_acquisition_data(data)
            }
        )

        split_table.scrutiny_resizable_table("refresh")

        //this.show_acquisition_data(payload)
    }

    stop_waiting_for_acquisition(): void {
        this.waiting_on_acquisition = false
        this.pending_acquisition_token = null
    }

    switch_to_graph() {
        this.graph_config_div.hide()
        this.graph_display_div.show()
        this.graph_broswer_div.hide()

        this.button_configure.enable()
        this.button_browse.enable()
        this.button_graph.disable()
    }

    switch_to_config() {
        this.graph_config_div.show()
        this.graph_display_div.hide()
        this.graph_broswer_div.hide()

        this.button_configure.disable()
        this.button_browse.enable()
        this.button_graph.enable()
    }

    switch_to_browser() {
        this.graph_config_div.hide()
        this.graph_display_div.hide()
        this.graph_broswer_div.show()

        this.button_configure.enable()
        this.button_browse.disable()
        this.button_graph.enable()
    }

    request_load_acquisition_data(reference_id: string) {
        const req: Partial<API.Message.C2S.ReadDataloggingAcquisitionContent> = {
            reference_id: reference_id,
        }
        this.app.server_conn.send_request("read_datalogging_acquisition_content", req)
    }

    show_acquisition_data(data: API.Message.S2C.ReadDataloggingAcquisitionContent) {
        this.switch_to_graph()
        if (this.chart !== null) {
            this.chart.clear()
            this.chart = null
        }
        const canvas = $("<canvas></canvas>")
        this.graph_display_div.html("")
        this.graph_display_div.append(canvas)

        const config = {} as ChartConfiguration
        config.type = "line"
        config.options = {}
        config.options.responsive = true
        config.options.maintainAspectRatio = false
        config.options.layout = {}
        config.options.layout.padding = 0

        config.options.interaction = {}
        config.options.interaction.intersect = false
        config.options.interaction.mode = "x"

        config.options.scales = {}
        config.data = { labels: [], datasets: [] }

        config.options.elements = {}
        config.options.elements.line = {
            tension: 0,
            borderWidth: 2,
        }
        config.options.elements.point = {
            pointStyle: "circle",
            radius: 0,
            hoverRadius: 5,
        }

        // Y - Axis
        const display_grid = data.yaxis.length <= 2 // Don't display grid if too many axis
        for (let i = 0; i < data.yaxis.length; i++) {
            const yaxis = data.yaxis[i]
            config.options.scales[`yaxis_${yaxis.id}`] = {
                type: "linear",
                position: "left",
                grid: {
                    display: display_grid,
                },
                title: {
                    display: true,
                    text: yaxis.name,
                    align: "end",
                    font: {
                        size: 12,
                    },
                },
            }
        }

        // X - Axis
        config.options.scales["x"] = {
            type: "linear",
            title: {
                display: true,
                text: data.xdata.name,
            },
        }

        // Dataseries
        for (let i = 0; i < data.signals.length; i++) {
            const signal = data.signals[i]
            const dataset = {
                label: signal.name,
                data: signal.data,
                yAxisID: `yaxis_${signal.axis_id}`,
                xAxisID: "x",
            } as ChartDataset<"line", number[]>
            config.data.datasets.push(dataset)
        }

        config.data.labels = data.xdata.data

        this.chart = new Chart(canvas[0], config)
        this.chart.update()
    }

    add_axis() {
        const signal_list_table = this.container.find("table.signal-list") as ScrutinyTreeTable
        const split_table = this.container.find("table.split-pane") as ScrutinyTreeTable

        const axis_rows = signal_list_table.scrutiny_treetable("get_root_nodes")
        let axis_name: string[] = []
        for (let i = 0; i < axis_rows.length; i++) {
            axis_name.push(trim($(axis_rows[i]).text(), " "))
        }

        let axis_number = 1
        let already_exist = false
        let axis_name_candidate = ""
        do {
            already_exist = false
            axis_name_candidate = "Axis " + axis_number
            for (let i = 0; i < axis_name.length; i++) {
                if (axis_name[i] == axis_name_candidate) {
                    already_exist = true
                    break
                }
            }
            axis_number++
        } while (already_exist)

        const tr = $(
            `<tr class="${CLASS_AXIS_ROW}"><td><div class="${CLASS_LIVE_EDIT_CONTENT}">${axis_name_candidate}</div></td></tr>`
        ) as JQueryLiveEdit<HTMLTableRowElement>
        tr.live_edit("init")

        signal_list_table.scrutiny_treetable(
            "add_root_node",
            `axisid-${this.next_axis_id}`,
            tr,
            false, // Children allowed
            true // No drag
        )

        this.next_axis_id++

        split_table.scrutiny_resizable_table("refresh")
    }

    /**
     * Sets the configuration form in it's "unavailable". USed when no device or device does not support datalogging
     */
    set_config_no_datalogging() {
        this.get_sampling_rate_select().html("<option>N/A</option>")
        this.get_xaxis_type_select().find('option[value="ideal_time"]').attr("disabled", "disabled")
        this.set_effective_sampling_rate("N/A")
        this.button_acquire.disable()
    }

    get_config_table(): JQuery<HTMLTableElement> {
        return this.graph_config_div.find("table.config-table:first") as JQuery<HTMLTableElement>
    }

    get_signal_list_table(): ScrutinyTreeTable {
        return this.graph_config_div.find("table.signal-list:first") as ScrutinyTreeTable
    }

    get_config_name_input(): JQuery<HTMLInputElement> {
        return this.get_config_table().find("input[name='config_name']") as JQuery<HTMLInputElement>
    }

    get_sampling_rate_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="sampling_rate"]') as JQuery<HTMLSelectElement>
    }

    get_decimation_input(): JQuery<HTMLInputElement> {
        return this.get_config_table().find('input[name="decimation"]') as JQuery<HTMLInputElement>
    }

    get_probe_location_input(): JQuery<HTMLInputElement> {
        return this.get_config_table().find('input[name="probe_location"]') as JQuery<HTMLInputElement>
    }

    get_timeout_input(): JQuery<HTMLInputElement> {
        return this.get_config_table().find('input[name="timeout"]') as JQuery<HTMLInputElement>
    }

    get_xaxis_type_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="xaxis_type"]') as JQuery<HTMLSelectElement>
    }

    get_trigger_type_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="trigger_type"]') as JQuery<HTMLSelectElement>
    }

    get_hold_time_input(): JQuery<HTMLInputElement> {
        return this.get_config_table().find('input[name="trigger_hold_time"]') as JQuery<HTMLInputElement>
    }

    get_selected_config_name() {
        return trim(this.get_config_name_input().val() as string, " ")
    }

    get_selected_sampling_rate(): API.Datalogging.SamplingRate | null {
        const val = parseInt(this.get_sampling_rate_select().val() as string)
        if (isNaN(val)) {
            return null
        }

        if (this.app.server_conn.datalogging_capabilities == null) {
            return null
        }

        if (val >= this.app.server_conn.datalogging_capabilities.sampling_rates.length) {
            return null
        }

        return this.app.server_conn.datalogging_capabilities.sampling_rates[val]
    }

    /**
     * Gets the selected decimation
     * @returns The decimation or null if invalid
     */
    get_selected_decimation(): number | null {
        const input = this.get_decimation_input()
        const val = parseInt(input.val() as string)
        if (isNaN(val)) {
            return null
        }

        if (val < MIN_DECIMATION || val > MAX_DECIMATION) {
            return null
        }
        return val
    }

    set_effective_sampling_rate(val: string | number) {
        if (typeof val === "number") {
            val = number2str(val, 3) + " Hz"
        }
        this.get_config_table().find('input[name="effective_sampling_rate"]').val(val)
    }

    /**
     * Gets the selected probe location
     * @returns The probe location or null if invalid
     */
    get_selected_probe_location(): number | null {
        const input = this.get_probe_location_input()
        const val = parseInt(input.val() as string)
        if (isNaN(val)) {
            return null
        }

        if (val < MIN_PROBE_LOCATION || val > MAX_PROBE_LOCATION) {
            return null
        }
        return val
    }

    /**
     * Gets the selected timeout
     * @returns The timeout or null if invalid
     */
    get_selected_timeout_sec(): number | null {
        const input = this.get_timeout_input()
        const val = parseFloat(input.val() as string)
        if (isNaN(val)) {
            return null
        }

        if (val < MIN_TIMEOUT_SEC || val > MAX_TIMEOUT_SEC) {
            return null
        }
        return val
    }

    get_selected_xaxis_type(): API.Datalogging.XAxisType {
        return this.get_xaxis_type_select().val() as API.Datalogging.XAxisType
    }

    get_selected_trigger_type(): API.Datalogging.TriggerType {
        const trigger_type = this.get_trigger_type_select().val() as API.Datalogging.TriggerType
        if (!NB_OPERANDS_MAP.hasOwnProperty(trigger_type)) {
            if (trigger_type == null) {
                throw "Unsupported trigger type"
            }
        }
        return trigger_type
    }

    get_configured_signal_config(): SignalTableConfig {
        const signal_config = { signals: [], yaxis: [] } as SignalTableConfig

        const treetable = this.get_signal_list_table()
        const root_nodes = treetable.scrutiny_treetable("get_root_nodes") as JQueryRow
        for (let i = 0; i < root_nodes.length; i++) {
            signal_config.yaxis.push({
                id: i,
                name: root_nodes.eq(i).text(),
            })

            const children = treetable.scrutiny_treetable("get_children", root_nodes.eq(i)) as JQueryRow
            for (let j = 0; j < children.length; j++) {
                signal_config.signals.push({ axis_id: i, row: children.eq(j) })
            }
        }

        return signal_config
    }

    /**
     * Gets the selected hold time
     * @returns The hold time or null if invalid
     */
    get_selected_hold_time_millisec(): number | null {
        const input = this.get_hold_time_input()
        const val = parseFloat(input.val() as string)
        if (isNaN(val)) {
            return null
        }

        if (val < MIN_HOLD_TIME_MS || val > MAX_HOLD_TIME_MS) {
            return null
        }
        return val
    }

    update_config_capabilities() {
        const capabilities = this.app.server_conn.datalogging_capabilities
        if (capabilities == null) {
            this.set_config_no_datalogging()
        } else {
            let sr_select = this.get_sampling_rate_select()
            sr_select.html("") // Removes content
            for (let i = 0; i < capabilities.sampling_rates.length; i++) {
                let sr = capabilities.sampling_rates[i]
                let option = $("<option></option>")
                option.prop("value", sr.identifier)
                let sr_name = "<No name>"
                if (sr.name !== "") {
                    sr_name = sr.name
                }
                if (sr.type == "fixed_freq") {
                    option.text(number2str(sr.frequency as number, 3) + " Hz")
                } else if (sr.type == "variable_freq") {
                    option.text(`VF[${sr.identifier}] : ${sr_name}`)
                }
                sr_select.append(option)
            }
            sr_select.removeAttr("disabled")
        }

        this.update_config_form()
    }

    update_config_form() {
        const selected_xaxis_type = this.get_selected_xaxis_type()
        const trigger_type = this.get_selected_trigger_type()
        if (selected_xaxis_type == "signal") {
            this.get_config_table().find(".line-xaxis-signal").show()
        } else {
            this.get_config_table().find(".line-xaxis-signal").hide()
        }

        const nb_operands = NB_OPERANDS_MAP[trigger_type]
        const operand1 = this.get_config_table().find(".line-operand1") as JQuery<HTMLTableRowElement>
        const operand2 = this.get_config_table().find(".line-operand2") as JQuery<HTMLTableRowElement>
        const operand3 = this.get_config_table().find(".line-operand3") as JQuery<HTMLTableRowElement>

        if (nb_operands >= 1) {
            operand1.show()
        } else {
            operand1.hide()
        }

        if (nb_operands >= 2) {
            operand2.show()
        } else {
            operand2.hide()
        }

        if (nb_operands >= 3) {
            operand3.show()
        } else {
            operand3.hide()
        }

        let sampling_rate = this.get_selected_sampling_rate()
        if (sampling_rate !== null) {
            const ideal_time_option = this.get_xaxis_type_select().find("option[value='ideal_time']")
            if (sampling_rate.type == "variable_freq") {
                if (selected_xaxis_type == "ideal_time") {
                    this.get_xaxis_type_select().find("option[value='measured_time']").prop("selected", "selected")
                }
                ideal_time_option.attr("disabled", "disabled")
            } else {
                ideal_time_option.removeAttr("disabled")
            }

            let decimation = this.get_config_table().find("input[name='decimation']").val()
            decimation = parseInt(decimation as string)
            if (isNaN(decimation)) {
                decimation = 0
            }

            if (decimation > 0 && sampling_rate.type == "fixed_freq") {
                this.set_effective_sampling_rate((sampling_rate.frequency as number) / decimation)
            } else {
                this.set_effective_sampling_rate("N/A")
            }
        }
    }

    validate_config_and_make_request(): Partial<API.Message.C2S.RequestDataloggingAcquisition> | null {
        this.clear_config_error()

        let valid = true
        const err_msg = $("<span></span>").addClass(CLASS_ERROR_MSG)

        let config_name = this.get_selected_config_name()
        if (config_name === "null") {
            this.get_config_name_input().val("Graph")
            config_name = "Graph"
        }

        const sampling_rate = this.get_selected_sampling_rate()
        if (sampling_rate == null) {
            valid = false
            const sr_select = this.get_sampling_rate_select()
            sr_select.addClass(CLASS_INPUT_ERROR)
            sr_select.after(err_msg.clone().text("Invalid value"))
        }

        const decimation = this.get_selected_decimation()
        if (decimation == null) {
            const input = this.get_decimation_input()
            input.addClass(CLASS_INPUT_ERROR)
            input.after(err_msg.clone().text("Invalid value"))
            valid = false
        }

        const probe_location = this.get_selected_probe_location()
        if (probe_location == null) {
            const input = this.get_probe_location_input()
            input.addClass(CLASS_INPUT_ERROR)
            input.after(err_msg.clone().text("Invalid value"))
            valid = false
        }

        const timeout = this.get_selected_timeout_sec()
        if (timeout == null) {
            const input = this.get_timeout_input()
            input.addClass(CLASS_INPUT_ERROR)
            input.after(err_msg.clone().text("Invalid value"))
            valid = false
        }

        const xaxis_type = this.get_selected_xaxis_type()
        if (xaxis_type == "ideal_time" && sampling_rate !== null) {
            if (sampling_rate.type == "variable_freq") {
                const select = this.get_xaxis_type_select()
                select.addClass(CLASS_INPUT_ERROR)
                select.after(err_msg.clone().text("Unavailable with variable frequency"))
                valid = false
            }
        }

        const trigger_type = this.get_selected_trigger_type()
        const nb_operands = NB_OPERANDS_MAP[trigger_type]

        const hold_time_millisec = this.get_selected_hold_time_millisec()
        if (hold_time_millisec === null) {
            const input = this.get_hold_time_input()
            input.addClass(CLASS_INPUT_ERROR)
            input.after(err_msg.clone().text("Invalid value"))
            valid = false
        }

        const signal_list_table = this.get_signal_list_table()
        const signal_config = this.get_configured_signal_config()
        if (signal_config.yaxis.length == 0) {
            valid = false
            signal_list_table.before(err_msg.clone().text("Missing Y-Axis"))
        } else if (signal_config.signals.length == 0) {
            valid = false
            signal_list_table.before(err_msg.clone().text("Missing signals"))
        }

        const signals = [] as API.Datalogging.AcquisitionRequestSignalDef[]
        for (let i = 0; i < signal_config.signals.length; i++) {
            const row = signal_config.signals[i].row
            const entry = WatchableInterface.get_entry_from_row(this.app.datastore, row)
            if (entry == null) {
                valid = false
                row.addClass(CLASS_INPUT_ERROR)
            } else {
                signals.push({
                    axis_id: signal_config.signals[i].axis_id,
                    id: entry.server_id,
                    name: WatchableInterface.get_name_cell(row).text(),
                })
            }
        }

        if (!valid) {
            return null
        }

        let request: Partial<API.Message.C2S.RequestDataloggingAcquisition> = {
            name: config_name,
            sampling_rate_id: (sampling_rate as API.Datalogging.SamplingRate).identifier,
            decimation: decimation as number,
            probe_location: (probe_location as number) / 100.0,
            timeout: timeout as number,
            x_axis_type: xaxis_type,
            x_axis_signal: null, // todo
            condition: trigger_type,
            operands: [], // todo
            trigger_hold_time: hold_time_millisec as number,
            signals: signals,
            yaxis: signal_config.yaxis,
        }

        return request
    }

    clear_config_error() {
        this.container.find(`.${CLASS_INPUT_ERROR}`).removeClass(CLASS_INPUT_ERROR)
        this.container.find(`.${CLASS_ERROR_MSG}`).remove()
    }

    resize() {
        const parent = this.layout_content_div.parent() as JQuery<HTMLDivElement>
        const top_delta = (this.layout_content_div.offset()?.top as number) - (parent.offset()?.top as number)
        this.layout_content_div.outerHeight((parent.innerHeight() as number) - top_delta)
    }

    destroy() {}

    static widget_name() {
        return "graph"
    }
    static display_name() {
        return "Embedded Graph"
    }

    static icon_path() {
        return "assets/img/graph-96x128.png"
    }

    static css_list() {
        return ["graph.css", "treetable-theme.css"]
    }

    static templates() {
        return {
            layout: "templates/layout.html",
            config_form_pane: "templates/config_form_pane.html",
            signal_list_pane: "templates/signal_list_pane.html",
        }
    }
}
