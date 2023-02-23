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
import { DatastoreEntryType, DatastoreEntryWithName, DatastoreEntry, AllDatastoreEntryTypes } from "@src/datastore"
import * as logging from "@src/logging"
import { trim } from "@src/tools"

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
import { scrutiny_live_edit as live_edit, CLASS_LIVE_EDIT_CONTENT } from "@scrutiny-live-edit"

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

interface JQueryLiveEdit<T> extends JQuery<T> {
    live_edit: Function
}

interface TableRowDetails {
    tr: JQueryRow
    td_name: JQueryLiveEdit<HTMLTableCellElement>
    td_value: JQueryLiveEdit<HTMLTableCellElement>
    td_type: JQueryLiveEdit<HTMLTableCellElement>
}

const ATTR_DISPLAY_PATH = "display_path" // Shared with varlist widget
const ATTR_ENTRY_TYPE = "entry_type" // Shared with varlist widget

const CLASS_TYPE_COL = "type_col" // Shared with varlist widget
const CLASS_NAME_COL = "name_col" // Shared with varlist widget
const CLASS_VALUE_COL = "value_col" // Shared with varlist widget
const CLASS_ENTRY_NODE = "entry_node"
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
                if (!source_table.hasClass("varlist-table") && !source_table.hasClass("watch-table")) {
                    return { scope: TransferScope.NONE }
                }
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

                    const td = first_row.find(`td.${CLASS_VALUE_COL}`) as JQueryLiveEdit<HTMLTableCellElement>
                    if (td.live_edit("is_label_mode")) {
                        td.live_edit("edit_mode")
                    }
                } else if (e.key == "F2") {
                    if (selected_rows.length > 1) {
                        that.display_table.scrutiny_treetable("select_node", first_row)
                    }

                    const td = first_row.find(`td.${CLASS_NAME_COL}`) as JQueryLiveEdit<HTMLTableCellElement>
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
     * Fetch the datastore entry that the given table line points to.
     * @param tr The table line
     * @returns The datastore entry pointed by the line
     */
    get_entry_from_row(tr: JQueryRow): DatastoreEntry | null {
        const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined
        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        if (typeof display_path !== "undefined" && typeof entry_type !== "undefined") {
            try {
                const entry = this.app.datastore.get_entry(entry_type, display_path)
                return entry
            } catch {
                tr.addClass(CLASS_UNAVAILABLE)
            }
        } else {
            throw "Missing proeprty on row"
        }

        return null
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
     * datasatore (if the server is disconnected or a different firmware is loaded)
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
            entry_type = entry_types[i]

            const filter = `tr[${ATTR_ENTRY_TYPE}="${entry_type}"]`
            const to_update = this.display_table.scrutiny_treetable("get_visible_nodes", optional_parent, filter) as JQueryRow
            to_update.each(function () {
                const tr = $(this)
                const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined
                if (typeof entry_type === "undefined" || typeof display_path === "undefined") {
                    that.make_row_available(tr, false)
                } else {
                    const exists = that.app.datastore.path_valid(entry_type, display_path)
                    if (exists) {
                        that.make_row_available(tr, true)
                    } else {
                        that.make_row_available(tr, false)
                    }
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
        const filter = `.${CLASS_ENTRY_NODE}:not(.${CLASS_WATCHED})`
        const to_watch = this.display_table.scrutiny_treetable("get_visible_nodes", optional_parent, filter) as JQueryRow
        to_watch.each(function () {
            const tr = $(this)
            if (that.is_row_available(tr)) {
                const entry = that.get_entry_from_row(tr)
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
        const filter = `.${CLASS_ENTRY_NODE}.${CLASS_WATCHED}`
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
        this.set_display_value(line, "N/A")
    }

    /**
     * Sets the value displayed by the row
     * @param tr The row
     * @param val The value to set
     */
    set_display_value(tr: JQueryRow, val: string | number) {
        tr.find(`td.${CLASS_VALUE_COL} span`).text(val)
    }

    /**
     * Writes a value to an entry so that it reaches the server
     * @param td The cell that was written. Used to find the row that points to the datastore entry
     * @param val The value to write
     * @returns the request ID returned by the server conn or null if it failed
     */
    write_value(td: JQueryCell, val: string): number | null {
        const tr = td.parent("tr") as unknown as JQueryRow
        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined

        if (typeof entry_type === "undefined" || typeof display_path === "undefined") {
            return null
        }
        const entry = this.app.datastore.get_entry(entry_type, display_path)
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
     * Creates a row to be displayed in this widget. Common to entry and folder.
     * @returns An object with all the HTML element created
     */
    make_basic_row(): TableRowDetails {
        const tr = $("<tr></tr>") as JQueryRow
        const td_name = $(
            `<td class="${CLASS_NAME_COL}"><div class="${CLASS_LIVE_EDIT_CONTENT}"></div></td>`
        ) as JQueryLiveEdit<HTMLTableCellElement>
        const td_value = $(
            `<td class="${CLASS_VALUE_COL}"><div class="${CLASS_LIVE_EDIT_CONTENT}"></div></td>`
        ) as JQueryLiveEdit<HTMLTableCellElement>
        const td_type = $(
            `<td class="${CLASS_TYPE_COL}"><div class="${CLASS_LIVE_EDIT_CONTENT}"></div></td>`
        ) as JQueryLiveEdit<HTMLTableCellElement>
        tr.append(td_name).append(td_value).append(td_type)

        return {
            tr: tr,
            td_name: td_name,
            td_value: td_value,
            td_type: td_type,
        }
    }

    /**
     * Creates an entry row (Var, alias, RPV) to be displayed in the watch table
     * @param text Name of the folder
     * @param display_path The datastore entry display path
     * @param entry_type The datastore entry type
     * @returns An object containings every HTML element in the row
     */
    make_entry_row(entry_type: DatastoreEntryType, display_path: string, entry_name: string, datatype: string): TableRowDetails {
        const that = this
        const row_data = this.make_basic_row()

        row_data.td_type.find(`div.${CLASS_LIVE_EDIT_CONTENT}`).text(datatype)
        row_data.tr.attr(ATTR_DISPLAY_PATH, display_path)
        row_data.tr.attr(ATTR_ENTRY_TYPE, entry_type)
        row_data.tr.addClass(CLASS_ENTRY_NODE)

        const live_editable_td_value = row_data.td_value as JQueryLiveEdit<HTMLTableCellElement>
        live_editable_td_value.live_edit("init", "N/A")
        live_editable_td_value.on("live-edit.commit", function (e, val: string) {
            that.write_value(row_data.td_value, val)
        })

        const live_editable_td_name = row_data.td_name as JQueryLiveEdit<HTMLTableCellElement>
        live_editable_td_name.live_edit("init", entry_name)

        const img = $("<div class='treeicon'/>")

        if (entry_type == DatastoreEntryType.Var) {
            img.addClass("icon-var")
        } else if (entry_type == DatastoreEntryType.Alias) {
            img.addClass("icon-alias")
        } else if (entry_type == DatastoreEntryType.RPV) {
            img.addClass("icon-rpv")
        } else {
            throw "Unknown entry type"
        }

        row_data.td_name.prepend(img)
        return row_data
    }

    /**
     * Creates a folder row to be displayed in the watch table
     * @param text Name of the folder
     * @param display_path The datastore entry display path
     * @param entry_type The datastore entry type
     * @returns An object containings every HTML element in the row
     */
    make_folder_row(text: string, display_path: string, entry_type: DatastoreEntryType): TableRowDetails {
        const that = this
        const row_data = this.make_basic_row()
        row_data.tr.attr(ATTR_DISPLAY_PATH, display_path)
        row_data.tr.attr(ATTR_ENTRY_TYPE, entry_type)

        row_data.td_name.live_edit("init", text)

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
                tr: that.make_entry_row(entry.entry_type, entry.display_path, entry.default_name ?? "", entry.datatype).tr,
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
            let entry_name: string
            let datatype: string

            // Reads data from the source watch window if we can. Will allow to transfer watch items
            // even if the server or the device is disconnected (datastore empty)
            if (source_table.hasClass("watch-table")) {
                datatype = bare_line.find(`td.${CLASS_TYPE_COL}`).text()
                entry_name = bare_line.find(`td.${CLASS_NAME_COL} span`).text()
            } else if (source_table.hasClass("varlist-table")) {
                const entry = this.app.datastore.get_entry(entry_type, display_path) as DatastoreEntryWithName
                datatype = entry.datatype
                entry_name = entry.default_name ?? "N/A"
            } else {
                return null
            }

            const new_row_data = this.make_entry_row(entry_type, display_path, entry_name, datatype)
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
