//    varlist.ts
//        A widget that shows the list of available watchables in the server in a tree-like
//        structure
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { DatastoreEntryType, AllDatastoreEntryTypes, DatastoreEntry } from "../../datastore"
import { BaseWidget } from "../../base_widget"
import { App } from "../../app"
import * as logging from "../../logging"
import * as $ from "jquery"
import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    LoadFunctionInterface as TreeTableLoadFunction,
} from "../../components/scrutiny-treetable/scrutiny-treetable"
import {
    scrutiny_resizable_table,
    PluginOptions as ResizableTableOptions,
} from "../../components/scrutiny-resizable-table/scrutiny-resizable-table"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
}

type RowType = DatastoreEntryType | "folder"
type JQueryRow = JQuery<HTMLTableRowElement>

const ATTR_DISPLAY_PATH = "display_path"
const ATTR_ENTRY_TYPE = "entry_type"

export class VarListWidget extends BaseWidget {
    /** The container in which to put data. That's our widget Canvas in the UI */
    container: JQuery
    /** The Scrutiny App instance */
    app: App
    /** The instance ID of this widget. */
    instance_id: number
    /** The name attributed the to the tree used to compute a unique HTML ID */
    tree_name: string
    /** A map mapping element display path with a unique numeric ID within this tree*/
    id_map: Record<string, number>
    /** Counter to generate the next tree ID */
    next_tree_id: number

    tree_table: ScrutinyTreeTable

    types_root_nodes: Record<DatastoreEntryType, JQuery<HTMLTableRowElement>>
    logger: logging.Logger

    /**
     *
     * @param container HTML container object in which to append the widget content
     * @param app The Scrutiny App instance
     * @param instance_id A unique instance number for this widget
     */
    constructor(container: HTMLElement, app: App, instance_id: number) {
        super(container, app, instance_id)
        this.container = $(container)
        this.app = app
        this.instance_id = instance_id

        this.tree_name = ""
        this.id_map = {}
        this.next_tree_id = 0
        // @ts-ignore
        this.tree_table = null
        // @ts-ignore
        this.types_root_nodes = {}
        this.logger = logging.getLogger("varlist" + instance_id)
    }

    /**
     * Initialize the widget
     */
    initialize(): void {
        const that = this
        this.tree_name = "varlist_tree_" + this.instance_id
        this.id_map = {}
        this.next_tree_id = 0

        const template_content = this.app.get_template(this, "varlist-content")
        if (template_content.length !== 1) {
            throw "Empty template content"
        }
        this.container.html(template_content[0])

        this.tree_table = template_content.find("table.varlist-table").first() as ScrutinyTreeTable
        this.tree_table.attr("id", this.tree_name)

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
        }

        this.tree_table.scrutiny_treetable(tree_table_options)

        this.types_root_nodes[DatastoreEntryType.Var] = this.make_row("Var", "/", "folder").attr(ATTR_ENTRY_TYPE, DatastoreEntryType.Var)
        this.types_root_nodes[DatastoreEntryType.Alias] = this.make_row("Alias", "/", "folder").attr(
            ATTR_ENTRY_TYPE,
            DatastoreEntryType.Alias
        )
        this.types_root_nodes[DatastoreEntryType.RPV] = this.make_row("RPV", "/", "folder").attr(ATTR_ENTRY_TYPE, DatastoreEntryType.RPV)

        this.tree_table.scrutiny_treetable("add_root_node", "root_var", this.types_root_nodes[DatastoreEntryType.Var])
        this.tree_table.scrutiny_treetable("add_root_node", "root_alias", this.types_root_nodes[DatastoreEntryType.Alias])
        this.tree_table.scrutiny_treetable("add_root_node", "root_rpv", this.types_root_nodes[DatastoreEntryType.RPV])

        // Event handlers
        $(document).on("scrutiny.datastore.ready", function (data) {
            /// that.rebuild_tree() // Todo use data to rebuild only missing nodes
        })

        $(document).on("scrutiny.datastore.clear", function (data) {
            //that.rebuild_tree() // Todo : USe data to clear only cleared data
        })

        // Setup
        //this.rebuild_tree()
        // Todo rebuild by type
        /*
        for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
            if (this.app.datastore.is_ready(AllDatastoreEntryTypes[i])) {
                this.rebuild_tree(AllDatastoreEntryTypes[i])
            } else {
                // TODO complete this?
            }
        }
        */

        setTimeout(function () {
            //that.rebuild_tree()
        })
    }

    /**
     * Destroy the widget
     */
    destroy() {}

    /**
     * Generate a unique ID assignable to a watchable node
     * @param display_path The path to the node
     * @returns A unique name used to identify node globally in the web document
     */
    make_node_id(display_path: string): string {
        if (!this.id_map.hasOwnProperty(display_path)) {
            this.id_map[display_path] = this.next_tree_id
            this.next_tree_id++
        }
        return this.tree_name + "_" + this.id_map[display_path]
    }

    make_row(default_text: string, display_path: string, row_type: RowType): JQueryRow {
        const tr = $("<tr></tr>") as JQueryRow
        const td1 = $(`<td>${default_text}</td>`)
        const td2 = $("<td></td>")
        tr.append(td1).append(td2)
        if (row_type === "folder") {
            td1.prepend($("<span>[Folder] </span>"))
        } else {
            td1.prepend($(`<span>[${row_type}] </span>`))
            td2.text("asdadasd")
        }

        tr.attr(ATTR_DISPLAY_PATH, display_path)

        return tr
    }

    table_load_fn(node_id: string, tr: JQueryRow, user_data?: any): ReturnType<TreeTableLoadFunction> {
        const that = this
        let output = [] as ReturnType<TreeTableLoadFunction>
        const display_path = tr.attr(ATTR_DISPLAY_PATH)
        if (typeof display_path == "undefined") {
            throw "Row without display_path"
        }

        const root_node = this.tree_table.scrutiny_treetable("get_root_node", tr) as JQueryRow | undefined
        if (typeof root_node === "undefined") {
            throw "No root node"
        }

        const entry_type = root_node.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        if (typeof entry_type === "undefined") {
            throw "Root node with no entry type"
        }

        const children = this.app.datastore.get_children(entry_type, display_path)

        children["subfolders"].forEach(function (subfolder, i) {
            output.push({
                tr: that.make_row(subfolder.name, subfolder.display_path, "folder"),
            })
        })

        children["entries"][entry_type].forEach(function (entry, i) {
            output.push({
                tr: that.make_row(entry.default_name as string, entry.display_path, entry.entry_type),
            })
        })

        return output
    }

    /**
     * Returns the HTML div that contains the object tree
     * @returns The container for the tree to display
     */
    get_tree_container() {
        return this.container.find(".varlist-tree-container")
    }

    /**
     * Rebuild the tree. Called on datastore ready event
     */
    rebuild_tree() {
        this.clear_tree()
        const that = this
    }

    // Erase the tree. Called on datastore.clear event
    clear_tree() {
        this.get_tree_container().html("")
    }

    static widget_name() {
        return "varlist"
    }
    static display_name() {
        return "Variable List"
    }

    static icon_path() {
        return "assets/img/treelist-96x128.png"
    }

    static css_list() {
        return ["varlist.css", "treetable-theme.css", "resizable-table-theme.css"]
    }

    static templates() {
        return {
            "varlist-content": "templates/varlist-content.html",
        }
    }
}
