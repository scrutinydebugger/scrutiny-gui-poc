//    watch.ts
//        Watch window widget. Its job is to display the value of watchables items.  Items
//        can be dragged from other watch widget or from VarList widget
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { default as $ } from "@jquery"
import { BaseWidget } from "@src/base_widget"
import { App } from "@src/app"
import { DatastoreEntryType } from "@src/datastore"
import * as logging from "@src/logging"

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    LoadFunctionInterface as TreeTableLoadFunction,
    TransferAllowedFunctionInterface as TransferAllowedFunction,
    TransferFunctionInterface as TransferFunction,
    TransferFunctionMetadata,
    TransferFunctionOutput,
    get_drag_data_from_drop_event,
    DragData,
} from "../../components/scrutiny-treetable/scrutiny-treetable"
import {
    scrutiny_resizable_table,
    PluginOptions as ResizableTableOptions,
} from "../../components/scrutiny-resizable-table/scrutiny-resizable-table"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
}

export class WatchWidget extends BaseWidget {
    /* TODO :
        - Stop watching when tab is not visible to free bandwidth on device link which may be slow and increase refresh rate of other vars    
        - Easy value edit
        - Multi selection
        - Property view (edition?)
        - Tree view
        - Rename variables
        - resize table
        - Display hex value
     */

    /** The container in which to put data. That's our widget Canvas in the UI */
    container: JQuery
    /** The Scrutiny App instance */
    app: App
    /** The instance ID of this widget. */
    instance_id: number

    display_table: ScrutinyTreeTable

    next_line_instance: number

    logger: logging.Logger

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

        //@ts-ignore
        this.display_table = null

        this.next_line_instance = 0
        this.logger = logging.getLogger(this.constructor.name)
    }

    /**
     * Initialize the widget
     */
    initialize() {
        let that = this
        let display_table = this.app.get_template(this, "display_table") as ScrutinyTreeTable
        this.display_table = display_table
        this.next_line_instance = 0

        this.display_table.attr("id", "watch_widget_" + this.instance_id)
        const resizable_table_options: ResizableTableOptions = {
            table_width_constrained: false,
        }

        const tree_table_options: TreeTableOptions = {
            load_fn: function (...args) {
                return that.table_load_fn(...args)
            } as TreeTableLoadFunction,
            resizable: true,
            resize_options: resizable_table_options,
            draggable: true,
            droppable: true,
            allow_transfer_fn: function () {
                return true
            },
            transfer_fn: function (...args): TransferFunctionOutput {
                return that.element_transfer_fn(...args)
            },
        }

        this.display_table.scrutiny_treetable(tree_table_options)
        this.container.append(this.display_table)

        this.container.on("dragover", function (e) {
            e.preventDefault()
        })

        this.container.on("drop", function (e) {
            const drag_data = get_drag_data_from_drop_event(e)
            if (drag_data == null) {
                return
            }

            e.stopPropagation()

            const src_table = $(`#${drag_data.source_table_id}`) as JQueryTable
            const dragged_row_id = drag_data.dragged_row_id
            if (src_table.is(that.display_table)) {
                that.display_table.scrutiny_treetable("move_node", dragged_row_id, null, null) // Put as root node at the end.
            } else {
                // Make a row transfer and put at the end as root node
                that.display_table.scrutiny_treetable("transfer_node_from", src_table, dragged_row_id, null, null)
            }
        })
    }

    destroy() {
        const that = this
        // Remove all lines even if not selected
        this.display_table.find("tr").each(function () {
            that.remove_var($(this) as JQueryRow)
        })
    }

    get_instance_name() {
        return "WatchWidget" + this.instance_id
    }

    get_line_id(instance: number) {
        return this.get_instance_name() + "_line_" + instance
    }

    add_var(entry_type: DatastoreEntryType, display_path: string) {
        let line = $("<tr></tr>")
        let line_instance = this.next_line_instance++
        let line_id = this.get_line_id(line_instance)
        line.attr("id", line_id)
        line.attr("display_path", display_path)
        line.attr("type", entry_type)
        line.append("<td>" + display_path + "</td>")
        line.append('<td class="value-cell"><span>0.0</span></td>')
        line.append('<td class="help-cell"><img src="assets/img/question-mark-grey-64x64.png" /></td>')
        this.display_table.find("tbody").first().append(line)

        let update_callback = function (val: number | null) {
            const newval = val === null ? "N/A" : "" + val
            line.find(".value-cell span").text(newval)
        }
        update_callback(this.app.datastore.get_value(entry_type, display_path))
        this.app.datastore.watch(entry_type, display_path, line_id, update_callback)
    }

    table_load_fn(node_id: string, tr: JQueryRow, user_data?: any): ReturnType<TreeTableLoadFunction> {
        return []
    }

    remove_var(line: JQueryRow) {
        const line_id = line.attr("id")
        if (typeof line_id !== "undefined") {
            this.app.datastore.unwatch_all(line_id)
        }
        line.remove()
    }

    element_transfer_fn(source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata): TransferFunctionOutput {
        const new_line = $("<tr></tr>") as JQueryRow
        const td_name = $("<td></td>")
        const td_value = $("<td></td>")
        const td_type = $("<td></td>")
        new_line.append(td_name).append(td_value).append(td_type)

        const output = { tr: new_line }
        if (source_table.hasClass("varlist-table") || source_table.hasClass("watch-table")) {
            td_name.html(bare_line.find(".name_col").html()).addClass("name_col")
            td_type.html(bare_line.find(".type_col").html()).addClass("type_col")
        } else {
            console.log
            this.logger.warning("Don't know how to convert table row coming from this table")
        }

        return output
    }

    static widget_name() {
        return "watch"
    }
    static display_name() {
        return "Watch Window"
    }

    static icon_path() {
        return "assets/img/eye-96x128.png"
    }

    static css_list() {
        return ["watch.css", "watch-treetable-theme.css"]
    }

    static templates() {
        return {
            display_table: "templates/display_table.html",
        }
    }
}
