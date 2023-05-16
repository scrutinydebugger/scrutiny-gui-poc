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
import { DatastoreEntryType, DatastoreEntry, AllDatastoreEntryTypes } from "@src/datastore"
import * as logging from "@src/logging"
import { trim } from "@src/tools"
import { WatchableTableInterface, CLASS_ENTRY_ROW } from "@src/widgets/common"

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    LoadFunctionInterface as TreeTableLoadFunction,
    TransferFunctionMetadata,
    TransferFunctionOutput,
    TransferScope,
    TransferCompleteEventData,
} from "@scrutiny-treetable"
import { scrutiny_resizable_table, PluginOptions as ResizableTableOptions } from "@scrutiny-resizable-table"
import { scrutiny_live_edit as live_edit, JQueryLiveEdit } from "@scrutiny-live-edit"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })
$.extend($.fn, { live_edit })

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
type JQueryCell = JQuery<HTMLTableCellElement>

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
}

interface TableRowDetails {
    tr: JQueryRow
    td_name: JQueryLiveEdit<HTMLTableCellElement>
    td_value: JQueryLiveEdit<HTMLTableCellElement>
    td_type: JQueryLiveEdit<HTMLTableCellElement>
}

const CLASS_WATCHED = "watched"
const CLASS_UNAVAILABLE = "unavailable"

export class WatchWidget extends BaseWidget {
    /* TODO :
        - Stop watching when tab is not visible (on collapse : CHECK.  On tab hide : TODO)
        - Easy value edit           CHECK
        - Multi selection           CHECK
        - Property view (edition?)
        - Tree view                 CHECK
        - Rename variables          CHECK   
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
            transfer_policy_fn: function (
                source_table: JQueryTable,
                dest_table: JQueryTable,
                tr: JQuery,
                new_parent_id: string | null,
                after_node_id: string | null
            ) {
                // Anything else than ALL is hard to manage when the datastore content changes.
                // More computation, but will avoid weird glitches such as empty folders that should not or mixing data if the user change
                // Loads another firmware and the treepath intersects.
                return { scope: TransferScope.ALL }
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

                    const td = WatchableTableInterface.get_value_cell(first_row) as JQueryLiveEdit<HTMLTableCellElement>
                    if (td.live_edit("is_label_mode")) {
                        td.live_edit("edit_mode")
                    }
                } else if (e.key == "F2") {
                    if (selected_rows.length > 1) {
                        that.display_table.scrutiny_treetable("select_node", first_row)
                    }

                    const td = WatchableTableInterface.get_name_cell(first_row) as JQueryLiveEdit<HTMLTableCellElement>
                    if (td.live_edit("is_label_mode")) {
                        td.live_edit("edit_mode")
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
            let last_root_node = that.display_table.scrutiny_treetable("get_root_nodes").last()
            if (last_root_node.length == 0) {
                last_root_node = null
            }

            that.display_table.scrutiny_treetable("handle_drop_event", e, null, last_root_node)
            e.stopPropagation()
        })

        // Collapse a folder and its descendant after its dropped in the widget
        this.display_table.on("stt.transfer-complete", function (e, data: TransferCompleteEventData) {
            that.display_table.scrutiny_treetable("collapse_all", data.output.new_top_node_id)
            that.watch_all_visible(data.output.new_top_node_id)
        })

        this.display_table.on("stt.expanded", function (event, data) {
            const row = $(event.target)
            that.update_availability(row)
            that.watch_all_visible(row)
        })

        this.display_table.on("stt.collapsed", function (event, data) {
            that.unwatch_all_hidden($(event.target))
        })

        this.app.on_event("scrutiny.datastore.ready", function (data: any) {
            that.update_availability(null, data["entry_type"] as DatastoreEntryType)
            that.watch_all_visible()
        })

        this.app.on_event("scrutiny.datastore.clear", function (data: any) {
            that.update_availability(null, data["entry_type"] as DatastoreEntryType)
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

    /**
     * Makes a unique HTML ID for the given row. Return the existing row if it exists
     * @param line The table row
     * @returns A HTML ID
     */
    get_or_make_line_id(line: JQueryRow) {
        let line_id = line.attr("id")
        if (typeof line_id === "undefined") {
            const line_instance = this.next_line_instance++
            line_id = this.get_instance_name() + "_line_" + line_instance
            line.attr("id", line_id)
        }
        return line_id
    }

    /**
     * Mark the table rows as available or unavailable. They are unavailable if the entry they point to is not in the
     * datastore (if the server is disconnected or a different firmware is loaded)
     * @param optional_parent The starting point of the recursive search. Will update only the descendant of this node if specified. All rows if not given
     * @param entry_type The entry type of the rows to update
     */
    update_availability(optional_parent: string | null = null, entry_type?: DatastoreEntryType) {
        const that = this
        let entry_types: DatastoreEntryType[] = AllDatastoreEntryTypes
        if (typeof entry_type !== "undefined") {
            entry_types = [entry_type]
        }

        for (let i = 0; i < entry_types.length; i++) {
            const actual_entry_type = entry_types[i]

            const filter = WatchableTableInterface.get_row_filter_by_entry_type(actual_entry_type)
            const to_update = this.display_table.scrutiny_treetable("get_visible_nodes", optional_parent, filter) as JQueryRow
            to_update.each(function () {
                const tr = $(this)
                try {
                    const display_path = WatchableTableInterface.get_display_path(tr)
                    const exists = that.app.datastore.path_valid(actual_entry_type, display_path)
                    if (exists) {
                        that.make_row_available(tr, true)
                    } else {
                        that.make_row_available(tr, false)
                    }
                } catch (e) {
                    that.logger.error("Error", e)
                    that.make_row_available(tr, false)
                }
            })
        }
    }

    /**
     * Mark a row as available or unavailable. grayed out when unavailable
     * @param tr The row
     * @param available Available when true. Unavailable when false
     */
    make_row_available(tr: JQueryRow, available: boolean) {
        if (available) {
            tr.removeClass(CLASS_UNAVAILABLE)
        } else {
            tr.addClass(CLASS_UNAVAILABLE)
            tr.removeClass(CLASS_WATCHED)
            this.stop_watching(tr)
        }
    }

    /**
     * Tells if a row is marked as available
     * @param tr The row
     * @returns True if available
     */
    is_row_available(tr: JQueryRow): boolean {
        return !tr.hasClass(CLASS_UNAVAILABLE)
    }

    /**
     * Start watching visible entries by registering a watcher to the datastore
     * @param optional_parent Optional starting point for the recursive scan. Will watch only the descendant of that node
     * if given
     */
    watch_all_visible(optional_parent?: JQueryRow | string | null) {
        const that = this
        const filter = `.${CLASS_ENTRY_ROW}:not(.${CLASS_WATCHED})`
        const to_watch = this.display_table.scrutiny_treetable("get_visible_nodes", optional_parent, filter) as JQueryRow
        to_watch.each(function () {
            const tr = $(this)
            if (that.is_row_available(tr)) {
                const entry = WatchableTableInterface.get_entry_from_row(that.app.datastore, tr)
                if (entry != null) {
                    that.start_watching(entry, tr)
                }
            }
        })
    }

    /**
     * Stop watching entries taht are not visible
     * @param optional_parent Optional starting point for the recursive scan. Will stop watching only the descendant of that node
     * if given
     */
    unwatch_all_hidden(optional_parent?: JQueryRow | string | null) {
        const that = this
        const filter = `.${CLASS_ENTRY_ROW}.${CLASS_WATCHED}`
        const to_unwatch = this.display_table.scrutiny_treetable("get_hidden_nodes", optional_parent, filter) as JQueryRow
        to_unwatch.each(function () {
            const tr = $(this)
            that.stop_watching(tr)
        })
    }

    /**
     * Make a table row starts to watch a datastore entry
     * @param entry The entry to watch
     * @param line The line that will become the watcher
     * @param value_cell The cell that needs to be updated by the callback
     */
    start_watching(entry: DatastoreEntry, line: JQueryRow, value_cell?: JQueryLiveEdit<HTMLTableCellElement>) {
        let line_id = this.get_or_make_line_id(line)

        if (typeof value_cell === "undefined") {
            value_cell = WatchableTableInterface.get_value_cell(line)
        }
        const value_cell2 = value_cell
        let update_callback = function (val: number | null) {
            const newval = val === null ? "N/A" : val.toString()
            if (value_cell2.live_edit("is_label_mode")) {
                value_cell2.live_edit("label_mode", newval)
            }
        }

        update_callback(this.app.datastore.get_value(entry.entry_type, entry.display_path))
        this.app.datastore.watch(entry.entry_type, entry.display_path, line_id, update_callback)
        line.addClass(CLASS_WATCHED)
    }

    /**
     * Make a table row stop watching all of the entries it was watching
     * @param line The table row
     */
    stop_watching(line: JQueryRow) {
        const line_id = line.attr("id")
        if (typeof line_id !== "undefined") {
            this.app.datastore.unwatch_all(line_id)
        }
        line.removeClass(CLASS_WATCHED)
        WatchableTableInterface.set_entry_row_display_value(line, "N/A")
    }

    /**
     * Writes a value to an entry so that it reaches the server
     * @param td The cell that was written. Used to find the row that points to the datastore entry
     * @param val The value to write
     * @returns the request ID returned by the server conn or null if it failed
     */
    write_value(td: JQueryCell, val: string): number | null {
        const tr = td.parent("tr") as unknown as JQueryRow
        let entry: DatastoreEntry

        try {
            const entry_type = WatchableTableInterface.get_entry_type(tr)
            const display_path = WatchableTableInterface.get_display_path(tr)
            entry = this.app.datastore.get_entry(entry_type, display_path)
        } catch (e) {
            this.logger.error("Cannot write value", e)
            return null
        }

        let value_valid = true
        let valnum = 0

        val = trim(val.toLowerCase(), " ")
        if (val === "true") {
            valnum = 1
        } else if (val === "false") {
            valnum = 0
        } else {
            valnum = parseFloat(val)
            if (isNaN(valnum)) {
                value_valid = false
            }
        }

        if (!value_valid) {
            return null
        }

        const data = {
            updates: [{ watchable: entry.server_id, value: valnum }],
        }
        // todo : Handle feedback? Display something on bad value? (like a fading red glow)
        return this.app.server_conn.send_request("write_value", data)
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
        let display_path: string
        let entry_type: DatastoreEntryType

        try {
            display_path = WatchableTableInterface.get_display_path(tr)
            entry_type = WatchableTableInterface.get_entry_type(tr)
        } catch {
            return []
        }

        let output = [] as ReturnType<TreeTableLoadFunction>
        const that = this
        const children = this.app.datastore.get_children(entry_type, display_path)
        children["subfolders"].forEach(function (subfolder, i) {
            const row_desc = WatchableTableInterface.make_folder_row_from_datastore_folder(subfolder, entry_type)
            row_desc.td_name.live_edit()
            output.push({
                tr: row_desc.tr,
            })
        })

        children["entries"][entry_type].forEach(function (entry, i) {
            const row_desc = WatchableTableInterface.make_entry_row(entry, entry.default_name ?? "", true, true)
            row_desc.td_name.live_edit()

            const td_val = row_desc.td_val as JQueryLiveEdit<HTMLTableCellElement> // Not null
            td_val.live_edit()
            td_val.on("live-edit.commit", function (e, val) {
                that.write_value(td_val, val)
            })

            output.push({
                tr: row_desc.tr,
                no_children: true,
            })
        })

        return output
    }

    element_transfer_fn(source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata): TransferFunctionOutput {
        const that = this
        let new_line: JQueryRow | null = null
        try {
            const text_name = WatchableTableInterface.get_name_cell(bare_line).text()

            if (WatchableTableInterface.is_entry_row(bare_line)) {
                const entry = WatchableTableInterface.get_entry_from_row(this.app.datastore, bare_line)
                if (entry == null) {
                    this.logger.error("Failed to transfer row. Entry not found in " + bare_line)
                    return null
                }

                const row_desc = WatchableTableInterface.make_entry_row(entry, text_name, true, true)
                row_desc.td_name.live_edit()

                const td_val = row_desc.td_val as JQueryLiveEdit<HTMLTableCellElement>
                td_val.live_edit()
                td_val.on("live-edit.commit", function (e, val) {
                    that.write_value(td_val, val)
                })
                new_line = row_desc.tr
            } else {
                // Folder row
                const display_path = WatchableTableInterface.get_display_path(bare_line)
                const entry_type = WatchableTableInterface.get_entry_type(bare_line)

                const folder_desc = WatchableTableInterface.make_folder_row(text_name, display_path, entry_type, 2)
                new_line = folder_desc.tr
            }
        } catch (e) {
            this.logger.error("Cannot transfer row", e)
            return null
        }

        return { tr: new_line as JQueryRow }
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
