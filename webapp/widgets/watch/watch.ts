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
import { DatastoreEntryType, DatastoreEntryWithName, SubfolderDescription } from "@src/datastore"
import * as logging from "@src/logging"

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    LoadFunctionInterface as TreeTableLoadFunction,
    TransferPolicyFunctionInterface,
    TransferFunctionInterface as TransferFunction,
    TransferFunctionMetadata,
    TransferFunctionOutput,
    TransferPolicy,
    TransferScope,
    get_drag_data_from_drop_event,
    DragData,
} from "@scrutiny-treetable"
import { scrutiny_resizable_table, PluginOptions as ResizableTableOptions } from "@scrutiny-resizable-table"
import { DatastoreEntry } from "../../datastore"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
type JQueryCell = JQuery<HTMLTableCellElement>

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
}

const ATTR_DISPLAY_PATH = "display_path"
const ATTR_ENTRY_TYPE = "entry_type"

const CLASS_TYPE_COL = "type_col"
const CLASS_NAME_COL = "name_col"
const CLASS_VALUE_COL = "value_col"
const CLASS_ENTRY_NODE = "entry_node"

export class WatchWidget extends BaseWidget {
    /* TODO :
        - Stop watching when tab is not visible to free bandwidth on device link which may be slow and increase refresh rate of other vars    
        - Easy value edit
        - Multi selection
        - Property view (edition?)
        - Tree view                 CHECK
        - Rename variables
        - resize table              CHECK
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
            transfer_policy_fn: function () {
                return { scope: TransferScope.VISIBLE_ONLY }
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

    get_or_make_lin_id(line: JQueryRow) {
        let line_id = line.attr("id")
        if (typeof line_id === "undefined") {
            const line_instance = this.next_line_instance++
            line_id = this.get_instance_name() + "_line_" + line_instance
            line.attr("id", line_id)
        }
        return line_id
    }

    start_watching(entry: DatastoreEntry, line: JQueryRow, value_cell: JQueryCell) {
        let line_id = this.get_or_make_lin_id(line)
        let update_callback = function (val: number | null) {
            const newval = val === null ? "N/A" : "" + val
            value_cell.text(newval)
        }
        update_callback(this.app.datastore.get_value(entry.entry_type, entry.display_path))
        this.app.datastore.watch(entry.entry_type, entry.display_path, line_id, update_callback)
    }

    make_entry_row(entry: DatastoreEntryWithName): JQueryRow {
        const tr = $("<tr></tr>") as JQueryRow
        const td_name = $(`<td class="${CLASS_NAME_COL}">${entry.default_name}</td>`)
        const td_value = $(`<td class"${CLASS_VALUE_COL}"></td>`)
        const td_type = $(`<td class="${CLASS_TYPE_COL}"></td>`)
        tr.append(td_name).append(td_value).append(td_type)
        td_type.text(entry.datatype)
        tr.attr(ATTR_DISPLAY_PATH, entry.display_path)
        tr.attr(ATTR_ENTRY_TYPE, entry.entry_type)
        tr.addClass(CLASS_ENTRY_NODE)

        this.start_watching(entry, tr, td_value)

        const img = $("<div class='treeicon'/>")

        if (entry.entry_type == DatastoreEntryType.Var) {
            img.addClass("icon-var")
        } else if (entry.entry_type == DatastoreEntryType.Alias) {
            img.addClass("icon-alias")
        } else if (entry.entry_type == DatastoreEntryType.RPV) {
            img.addClass("icon-rpv")
        }

        td_name.prepend(img)
        return tr
    }

    make_folder_row(subfolder: SubfolderDescription, entry_type: DatastoreEntryType): JQueryRow {
        const tr = $("<tr></tr>") as JQueryRow
        const td_name = $(`<td class="${CLASS_NAME_COL}">${subfolder.name}</td>`)
        const td_value = $(`<td class"${CLASS_VALUE_COL}"></td>`)
        const td_type = $(`<td class='${CLASS_TYPE_COL}'></td>`)
        tr.append(td_name).append(td_value).append(td_type)
        tr.attr(ATTR_DISPLAY_PATH, subfolder.display_path)
        tr.attr(ATTR_ENTRY_TYPE, entry_type)

        const img = $("<div class='treeicon icon-folder' />")
        td_name.prepend(img)
        return tr
    }

    /**
     * The tree table load function.  This will be called only for unloaded nodes.
     * The watch window will contain a mix of user-defined nodes and nodes coming from the varlist widget.
     * For optimization purpose, we do not load everything coming from the valist because the user could
     * drag a root node with a HUGE amount of descendant.  These node will have a specific attribute
     * added by the transfer function and we will fetch the data from the datastore if we need it
     * @param node_id
     * @param tr
     * @param user_data
     * @returns
     */
    table_load_fn(node_id: string, tr: JQueryRow, user_data?: any): ReturnType<TreeTableLoadFunction> {
        const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined
        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        if (typeof display_path === "undefined" || typeof entry_type === "undefined") {
            return []
        }

        let output = [] as ReturnType<TreeTableLoadFunction>
        const that = this
        const children = this.app.datastore.get_children(entry_type, display_path)
        children["subfolders"].forEach(function (subfolder, i) {
            output.push({
                tr: that.make_folder_row(subfolder, entry_type),
            })
        })

        children["entries"][entry_type].forEach(function (entry, i) {
            output.push({
                tr: that.make_entry_row(entry),
                no_children: true,
            })
        })

        return output
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
        const td_name = $(`<td class=${CLASS_NAME_COL}></td>`)
        const td_value = $(`<td class=${CLASS_VALUE_COL}></td>`)
        const td_type = $(`<td class=${CLASS_TYPE_COL}></td>`)
        new_line.append(td_name).append(td_value).append(td_type)
        const output = { tr: new_line }

        if (!source_table.hasClass("varlist-table") && !source_table.hasClass("watch-table")) {
            this.logger.error("Don't know how to convert table row coming from this table")
            return output
        }

        const display_path = bare_line.attr(ATTR_DISPLAY_PATH) as string | undefined
        const entry_type = bare_line.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        const is_node = bare_line.hasClass(CLASS_ENTRY_NODE)

        if (typeof display_path === "undefined") {
            this.logger.error("Missing display path on node")
            return output
        }

        if (typeof entry_type === "undefined") {
            this.logger.error("Missing entry type on node")
            return output
        }

        new_line.attr(ATTR_DISPLAY_PATH, display_path)
        new_line.attr(ATTR_ENTRY_TYPE, entry_type)
        if (is_node) {
            const entry = this.app.datastore.get_entry(entry_type, display_path)
            this.start_watching(entry, new_line, td_value)
        }

        td_name.html(bare_line.find(".name_col").html()).addClass("name_col")
        td_type.html(bare_line.find(".type_col").html()).addClass("type_col")

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
