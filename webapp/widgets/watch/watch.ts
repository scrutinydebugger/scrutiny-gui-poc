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
import { DatastoreEntryType, DatastoreEntryWithName, DatastoreEntry } from "@src/datastore"
import * as logging from "@src/logging"

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    LoadFunctionInterface as TreeTableLoadFunction,
    TransferFunctionMetadata,
    TransferFunctionOutput,
    TransferScope,
    get_drag_data_from_drop_event,
    TransferCompleteEventData,
    SelectedRowKeydownCallback,
} from "@scrutiny-treetable"
import { scrutiny_resizable_table, PluginOptions as ResizableTableOptions } from "@scrutiny-resizable-table"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
type JQueryCell = JQuery<HTMLTableCellElement>
type LiveEditCompleteCallback = (val: string) => void

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
}

interface TableRowDetails {
    tr: JQueryRow
    td_name: JQueryCell
    td_value: JQueryCell
    td_type: JQueryCell
}

const ATTR_DISPLAY_PATH = "display_path"
const ATTR_ENTRY_TYPE = "entry_type"
const ATTR_LIVE_EDIT_CANCEL_VAL = "live-edit-last-val"

const CLASS_TYPE_COL = "type_col"
const CLASS_NAME_COL = "name_col"
const CLASS_VALUE_COL = "value_col"
const CLASS_ENTRY_NODE = "entry_node"
const CLASS_LIVE_EDIT = "live_edit"
const CLASS_CELL_CONTENT = "cell_content"
const CLASS_WATCHED = "watched"

export class WatchWidget extends BaseWidget {
    /* TODO :
        - Stop watching when tab is not visible 
        - Easy value edit           CHECK
        - Multi selection
        - Property view (edition?)
        - Tree view                 CHECK
        - Rename variables  CHECK
        - resize table              CHECK
        - Display hex value
     */

    /** The container in which to put data. That's our widget Canvas in the UI */
    container: JQuery
    /** The Scrutiny App instance */
    app: App
    /** The instance ID of this widget. */
    instance_id: number
    /** The table used to display the tree */
    display_table: ScrutinyTreeTable
    /** An incrementing counter to generate uniques ids for table lines */
    next_line_instance: number
    /** Logger element */
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
            allow_delete: true,
            scrollable_element: this.container.parent(),
            transfer_policy_fn: function () {
                return { scope: TransferScope.VISIBLE_ONLY }
            },
            transfer_fn: function (...args): TransferFunctionOutput {
                return that.element_transfer_fn(...args)
            },
            keydown_callback: function (e: JQuery.KeyDownEvent, selected_rows: JQueryRow) {
                const first_row = selected_rows.first()
                if (e.key == "Enter") {
                    if (selected_rows.length > 1) {
                        that.display_table.scrutiny_treetable("select_node", first_row)
                    }

                    const td = first_row.find(`td.${CLASS_VALUE_COL}`) as JQueryCell
                    if (!td.hasClass(CLASS_LIVE_EDIT)) {
                        that.start_live_edit(td, function (val: string) {
                            that.live_edit_value_cell_changed(td, val)
                        })
                    }
                } else if (e.key == "F2") {
                    if (selected_rows.length > 1) {
                        that.display_table.scrutiny_treetable("select_node", first_row)
                    }

                    const td = first_row.find(`td.${CLASS_NAME_COL}`) as JQueryCell
                    if (!td.hasClass(CLASS_LIVE_EDIT)) {
                        that.start_live_edit(td, function (val: string) {
                            that.live_edit_name_cell_changed(td, val)
                        })
                    }
                }
            },
            pre_delete_callback: function (tr: JQueryRow) {
                that.stop_watching(tr)
            },
        }

        this.display_table.scrutiny_treetable(tree_table_options)
        this.container.append(this.display_table)

        // Drag over the container, but not over the table.
        this.container.on("dragover", function (e) {
            e.preventDefault()
        })

        // Drop in the widget, but not on the table
        this.container.on("drop", function (e) {
            const drag_data = get_drag_data_from_drop_event(e)
            if (drag_data == null) {
                return
            }

            e.stopPropagation()

            const src_table = $(`#${drag_data.source_table_id}`) as JQueryTable
            const dragged_row_id = drag_data.dragged_row_id
            let last_root_node = that.display_table.scrutiny_treetable("get_root_nodes").last()
            if (last_root_node.length == 0) {
                last_root_node = null
            }
            if (src_table.is(that.display_table)) {
                that.display_table.scrutiny_treetable("move_node", dragged_row_id, null, last_root_node) // Put as root node at the end.
            } else {
                // Make a row transfer and put at the end as root node
                that.display_table.scrutiny_treetable("transfer_node_from", src_table, dragged_row_id, null, last_root_node)
            }
        })

        // Collapse a folder and its descendant after its dropped in the widget
        this.display_table.on("stt.transfer_complete", function (e, data: TransferCompleteEventData) {
            that.display_table.scrutiny_treetable("collapse_all", data.output.new_top_node_id)
            that.watch_all_visible(data.output.new_top_node_id)
        })

        this.display_table.on("stt.expanded", function (event, data) {
            that.watch_all_visible($(event.target))
        })

        this.display_table.on("stt.collapsed", function (event, data) {
            that.unwatch_all_hidden($(event.target))
        })
    }

    destroy() {
        const that = this
        // Remove all lines even if not selected
        this.display_table.find("tr").each(function () {
            that.stop_watching($(this) as JQueryRow)
            $(this).remove()
        })
    }

    get_instance_name() {
        return "WatchWidget" + this.instance_id
    }

    get_entry_from_row(tr: JQueryRow): DatastoreEntry {
        const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined
        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        if (typeof display_path !== "undefined" && typeof entry_type !== "undefined") {
            return this.app.datastore.get_entry(entry_type, display_path)
        }
        throw "Missing proeprty on row"
    }

    get_or_make_line_id(line: JQueryRow) {
        let line_id = line.attr("id")
        if (typeof line_id === "undefined") {
            const line_instance = this.next_line_instance++
            line_id = this.get_instance_name() + "_line_" + line_instance
            line.attr("id", line_id)
        }
        return line_id
    }

    watch_all_visible(optional_parent?: JQueryRow | string | null) {
        const that = this
        const filter = `.${CLASS_ENTRY_NODE}:not(.${CLASS_WATCHED})`
        const to_watch = this.display_table.scrutiny_treetable("get_visible_nodes", optional_parent, filter) as JQueryRow
        to_watch.each(function () {
            const tr = $(this)
            const entry = that.get_entry_from_row(tr)
            that.start_watching(entry, tr)
        })
    }

    unwatch_all_hidden(optional_parent?: JQueryRow | string | null) {
        const that = this
        const filter = `.${CLASS_ENTRY_NODE}.${CLASS_WATCHED}`
        const to_unwatch = this.display_table.scrutiny_treetable("get_hidden_nodes", optional_parent, filter) as JQueryRow
        to_unwatch.each(function () {
            const tr = $(this)
            that.stop_watching(tr)
        })
    }

    start_watching(entry: DatastoreEntry, line: JQueryRow, value_cell?: JQueryCell) {
        let line_id = this.get_or_make_line_id(line)

        if (typeof value_cell === "undefined") {
            value_cell = line.find(`td.${CLASS_VALUE_COL}`) as JQueryCell
        }
        const value_cell2 = value_cell
        let update_callback = function (val: number | null) {
            const newval = val === null ? "N/A" : "" + val
            const span = value_cell2.find(`span`).first()
            span.text(newval) // If user is editing, span will not exist
        }
        update_callback(this.app.datastore.get_value(entry.entry_type, entry.display_path))
        this.app.datastore.watch(entry.entry_type, entry.display_path, line_id, update_callback)
        line.addClass(CLASS_WATCHED)
    }

    stop_watching(line: JQueryRow) {
        const line_id = line.attr("id")
        if (typeof line_id !== "undefined") {
            this.app.datastore.unwatch_all(line_id)
        }
        line.removeClass(CLASS_WATCHED)
        this.set_display_value(line, "N/A")
    }

    set_display_value(tr: JQueryRow, val: string | number) {
        tr.find(`td.${CLASS_VALUE_COL} span`).text(val)
    }

    cancel_all_live_edit() {
        const live_edited_cells = $(`.${CLASS_LIVE_EDIT}`) as JQueryCell
        live_edited_cells.each(function () {
            const cell = $(this)
            const content = cell.find(`.${CLASS_CELL_CONTENT}`)
            content.html()
            content.text(cell.attr(ATTR_LIVE_EDIT_CANCEL_VAL))
        })
    }

    init_entry_live_editable_cell(td: JQueryCell, complete_callback: LiveEditCompleteCallback, val?: string) {
        const that = this
        const span = $(`<span></span>`) as JQuery<HTMLSpanElement>
        if (typeof val !== "undefined") {
            span.text(val)
        }
        td.find(`div.${CLASS_CELL_CONTENT}`).html(span[0])
        td.removeClass(CLASS_LIVE_EDIT)
        td.attr(ATTR_LIVE_EDIT_CANCEL_VAL, "")

        td.on("dblclick", function () {
            that.start_live_edit(td, complete_callback)
        })
    }

    start_live_edit(td: JQueryCell, complete_callback: LiveEditCompleteCallback) {
        const that = this
        this.cancel_all_live_edit()
        td.addClass(CLASS_LIVE_EDIT)
        td.off("dblclick") // Remove handler so they don't stack
        const span = td.find("span")
        if (span.length == 0) {
            return
        }
        const value = span.text()
        td.attr(ATTR_LIVE_EDIT_CANCEL_VAL, value)
        const input = $("<input type='text' />") as JQuery<HTMLInputElement>

        input.on("blur", function () {
            complete_callback($(this).val())
            that.init_entry_live_editable_cell(td, complete_callback, $(this).val())
        })

        input.on("keydown", function (e) {
            if (e.key == "Enter") {
                complete_callback($(this).val())
                that.init_entry_live_editable_cell(td, complete_callback, $(this).val())
                e.stopPropagation()
            }

            if (e.key == "Escape") {
                that.init_entry_live_editable_cell(td, complete_callback, value)
                e.stopPropagation()
            }
        })
        input.val(value)
        td.find(`div.${CLASS_CELL_CONTENT}`).html(input[0])

        setTimeout(function () {
            td.find("input").trigger("focus").trigger("select")
        }, 0)
    }

    write_value(td: JQueryCell, val: string) {
        const tr = td.parent("tr") as unknown as JQueryRow
        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined

        if (typeof entry_type === "undefined" || typeof display_path === "undefined") {
            return
        }
        const entry = this.app.datastore.get_entry(entry_type, display_path)
        const valnum = parseFloat(val) // TODO : Make this robust
        const data = {
            updates: [
                {
                    watchable: entry.server_id,
                    value: valnum,
                },
            ],
        }
        this.app.server_conn.send_request("write_value", data)
    }

    make_basic_row(): TableRowDetails {
        const tr = $("<tr></tr>") as JQueryRow
        const td_name = $(`<td class="${CLASS_NAME_COL}"><div class="${CLASS_CELL_CONTENT}"></div></td>`) as JQueryCell
        const td_value = $(`<td class="${CLASS_VALUE_COL}"><div class="${CLASS_CELL_CONTENT}"></div></td>`) as JQueryCell
        const td_type = $(`<td class="${CLASS_TYPE_COL}"><div class="${CLASS_CELL_CONTENT}"></div></td>`) as JQueryCell
        tr.append(td_name).append(td_value).append(td_type)

        return {
            tr: tr,
            td_name: td_name,
            td_value: td_value,
            td_type: td_type,
        }
    }

    live_edit_value_cell_changed(td: JQueryCell, val: string) {
        this.write_value(td, val)
    }

    live_edit_name_cell_changed(td: JQueryCell, val: string) {}

    make_entry_row(entry: DatastoreEntryWithName): TableRowDetails {
        const that = this
        const row_data = this.make_basic_row()

        row_data.td_type.find(`div.${CLASS_CELL_CONTENT}`).text(entry.datatype)
        row_data.tr.attr(ATTR_DISPLAY_PATH, entry.display_path)
        row_data.tr.attr(ATTR_ENTRY_TYPE, entry.entry_type)
        row_data.tr.addClass(CLASS_ENTRY_NODE)

        this.init_entry_live_editable_cell(
            row_data.td_value,
            function (val: string) {
                that.live_edit_value_cell_changed(row_data.td_value, val)
            },
            "N/A"
        )
        this.init_entry_live_editable_cell(
            row_data.td_name,
            function (val: string) {
                that.live_edit_name_cell_changed(row_data.td_name, val)
            },
            entry.default_name
        )
        //this.start_watching(entry, tr, td_value)

        const img = $("<div class='treeicon'/>")

        if (entry.entry_type == DatastoreEntryType.Var) {
            img.addClass("icon-var")
        } else if (entry.entry_type == DatastoreEntryType.Alias) {
            img.addClass("icon-alias")
        } else if (entry.entry_type == DatastoreEntryType.RPV) {
            img.addClass("icon-rpv")
        }

        row_data.td_name.prepend(img)
        return row_data
    }

    make_folder_row(text: string, display_path: string, entry_type: DatastoreEntryType): TableRowDetails {
        const that = this
        const row_data = this.make_basic_row()
        row_data.tr.attr(ATTR_DISPLAY_PATH, display_path)
        row_data.tr.attr(ATTR_ENTRY_TYPE, entry_type)

        this.init_entry_live_editable_cell(
            row_data.td_name,
            function (val: string) {
                that.live_edit_name_cell_changed(row_data.td_name, val)
            },
            text
        )

        const img = $("<div class='treeicon icon-folder' />")
        row_data.td_name.prepend(img)
        return row_data
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
                tr: that.make_folder_row(subfolder.name, subfolder.display_path, entry_type).tr,
            })
        })

        children["entries"][entry_type].forEach(function (entry, i) {
            output.push({
                tr: that.make_entry_row(entry).tr,
                no_children: true,
            })
        })

        return output
    }

    element_transfer_fn(source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata): TransferFunctionOutput {
        if (!source_table.hasClass("varlist-table") && !source_table.hasClass("watch-table")) {
            this.logger.error("Don't know how to convert table row coming from this table")
            return null
        }

        const display_path = bare_line.attr(ATTR_DISPLAY_PATH) as string | undefined
        const entry_type = bare_line.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined

        if (typeof display_path === "undefined") {
            this.logger.error("Missing display path on node")
            return null
        }

        if (typeof entry_type === "undefined") {
            this.logger.error("Missing entry type on node")
            return null
        }

        const is_node = bare_line.hasClass(CLASS_ENTRY_NODE)
        let new_line: JQueryRow
        if (is_node) {
            const entry = this.app.datastore.get_entry(entry_type, display_path)
            const new_row_data = this.make_entry_row(entry)
            //this.start_watching(entry, new_row_data.tr, new_row_data.td_value)
            new_line = new_row_data.tr
        } else {
            const text_name = bare_line.find(`td.${CLASS_NAME_COL}`).text()
            const new_row_data = this.make_folder_row(text_name, display_path, entry_type)
            new_line = new_row_data.tr
        }

        return { tr: new_line }
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
