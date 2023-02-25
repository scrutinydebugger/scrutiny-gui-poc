import { BaseWidget } from "@src/base_widget"
import { App } from "@src/app"
import * as logging from "@src/logging"
import { default as $ } from "@jquery"
import { number2str, trim, force_input_int, force_input_float } from "@src/tools"
import { XAxisType, TriggerType, DataloggingSamplingRate } from "@src/server_api"
import { configure_all_tooltips } from "@src/ui"
import { scrutiny_live_edit as live_edit, CLASS_LIVE_EDIT_CONTENT, JQueryLiveEdit } from "@scrutiny-live-edit"
import { WatchableInterface } from "@src/widgets/common"

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    LoadFunctionInterface as TreeTableLoadFunction,
    TransferScope,
    TransferPolicy,
    TransferFunctionMetadata,
    TransferFunctionOutput,
} from "@scrutiny-treetable"
import { scrutiny_resizable_table, PluginOptions as ResizableTableOptions } from "@scrutiny-resizable-table"

const CLASS_AXIS_ROW = "axis"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

type JQueryTable = JQuery<HTMLTableElement>
type JQueryRow = JQuery<HTMLTableRowElement>

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
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
    }

    /**
     * Initialize the widget
     */
    initialize() {
        const that = this
        const layout = this.app.get_template(this, "layout") as JQuery<HTMLDivElement>
        const config_form_pane = this.app.get_template(this, "config_form_pane") as JQuery<HTMLDivElement>
        const signal_list_pane = this.app.get_template(this, "signal_list_pane") as JQuery<HTMLDivElement>
        layout.find(".graph-config .pane-right").append(config_form_pane)
        layout.find(".graph-config .pane-left").append(signal_list_pane)
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

        config_table.find('input[name="decimation"]').on("change", function () {
            force_input_int($(this), 1, 0xffff)
            that.update_config_form()
        })

        config_table.find('input[name="probe_location"]').on("change", function () {
            force_input_int($(this), 0, 100)
            that.update_config_form()
        })

        config_table.find('input[name="timeout"]').on("change", function () {
            force_input_float($(this), 0, 360)
            that.update_config_form()
        })

        config_table.find('input[name="trigger_hold_time"]').on("change", function () {
            force_input_float($(this), 0, 360000)
            that.update_config_form()
        })

        configure_all_tooltips(config_table)

        const split_table = this.container.find("table.split-pane") as ScrutinyTreeTable
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
            move_allowed: true,
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

        that.add_axis()
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
    }

    get_config_table(): JQuery<HTMLTableElement> {
        return this.container.find(".form-pane table") as JQuery<HTMLTableElement>
    }

    set_effective_sampling_rate(val: string | number) {
        if (typeof val === "number") {
            val = number2str(val, 3) + " Hz"
        }
        this.get_config_table().find('input[name="effective_sampling_rate"]').val(val)
    }

    get_xaxis_type_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="xaxis_type"]') as JQuery<HTMLSelectElement>
    }

    get_sampling_rate_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="sampling_rate"]') as JQuery<HTMLSelectElement>
    }

    get_selected_sampling_rate(): DataloggingSamplingRate | null {
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

    get_selected_xaxis_type(): XAxisType {
        return this.get_xaxis_type_select().val() as XAxisType
    }

    get_selected_trigger_type(): TriggerType {
        return this.get_config_table().find("select[name='trigger_type']").val() as TriggerType
    }

    update_config_form() {
        const selected_xaxis_type = this.get_selected_xaxis_type()
        const trigger_type = this.get_selected_trigger_type()
        if (selected_xaxis_type == "signal") {
            this.get_config_table().find(".line-xaxis-signal").show()
        } else {
            this.get_config_table().find(".line-xaxis-signal").hide()
        }

        const nb_operands_map: Record<TriggerType, number> = {
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

        const nb_operands = nb_operands_map[trigger_type]
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

    destroy() {}

    static widget_name() {
        return "graph"
    }
    static display_name() {
        return "Graph Viewer"
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
