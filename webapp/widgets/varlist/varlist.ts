//    varlist.ts
//        A widget that shows the list of available watchables in the server in a tree-like
//        structure
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { DatastoreEntryType, SubfolderDescription, DatastoreEntryWithName, AllDatastoreEntryTypes } from "@src/datastore"
import { BaseWidget } from "@src/base_widget"
import { App } from "@src/app"
import * as logging from "@src/logging"
import { default as $ } from "@jquery"
import { WatchableInterface } from "@src/widgets/common"

import { scrutiny_treetable, PluginOptions as TreeTableOptions, LoadFunctionInterface as TreeTableLoadFunction } from "@scrutiny-treetable"
import { scrutiny_resizable_table, PluginOptions as ResizableTableOptions } from "@scrutiny-resizable-table"

$.extend($.fn, { scrutiny_treetable })
$.extend($.fn, { scrutiny_resizable_table })

interface ScrutinyTreeTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
    scrutiny_resizable_table: Function
}

type JQueryRow = JQuery<HTMLTableRowElement>

const ATTR_DISPLAY_PATH = "display_path"
const ATTR_ENTRY_TYPE = "entry_type"

const CLASS_TYPE_COL = "type_col"
const CLASS_NAME_COL = "name_col"
const CLASS_ENTRY_NODE = "entry_node"

interface RootNodeDesc {
    id: string
    label: string
}

const ROOT_NODE_DESC = {} as Record<DatastoreEntryType, RootNodeDesc>
ROOT_NODE_DESC[DatastoreEntryType.Var] = {
    id: "root_var",
    label: "Var",
}
ROOT_NODE_DESC[DatastoreEntryType.Alias] = {
    id: "root_alias",
    label: "Alias",
}
ROOT_NODE_DESC[DatastoreEntryType.RPV] = {
    id: "root_rpv",
    label: "RPV",
}

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

    logger: logging.Logger

    /**
     *
     * @param container HTML container object in which to append the widget content
     * @param app The Scrutiny App instance
     * @param instance_id A unique instance number for this widget
     */
    constructor(container: JQuery<HTMLDivElement>, app: App, instance_id: number) {
        super(container, app, instance_id)
        this.container = $(container)
        this.app = app
        this.instance_id = instance_id

        this.tree_name = ""
        this.id_map = {}
        this.next_tree_id = 0
        // @ts-ignore
        this.tree_table = null

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
            allow_delete: false,
            scrollable_element: this.container.parent(),
        }

        this.tree_table.scrutiny_treetable(tree_table_options)

        // Event handlers
        $(document).on("scrutiny.datastore.ready", function (data: any) {
            that.rebuild_tree(data["entry_type"]) // Todo use data to rebuild only missing nodes
        })

        $(document).on("scrutiny.datastore.clear", function (data: any) {
            that.clear_tree(data["entry_type"]) // Todo : USe data to clear only cleared data
        })

        setTimeout(function () {
            that.rebuild_tree()
        })
    }

    /**
     * Destroy the widget
     */
    destroy() {}

    table_load_fn(node_id: string, tr: JQueryRow, user_data?: any): ReturnType<TreeTableLoadFunction> {
        const that = this
        let output = [] as ReturnType<TreeTableLoadFunction>
        const display_path = tr.attr(ATTR_DISPLAY_PATH)
        if (typeof display_path == "undefined") {
            throw "Row without display_path"
        }

        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        if (typeof entry_type == "undefined") {
            throw "Row without entry_type"
        }

        const children = this.app.datastore.get_children(entry_type, display_path)

        children["subfolders"].forEach(function (subfolder, i) {
            const row_desc = WatchableInterface.make_folder_row_from_datastore_folder(subfolder, entry_type, 1)
            output.push({
                tr: row_desc.tr,
            })
        })

        children["entries"][entry_type].forEach(function (entry, i) {
            const row_data = WatchableInterface.make_entry_row(entry, entry.default_name ?? "", false, true)
            output.push({
                tr: row_data.tr,
                no_children: true,
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
    rebuild_tree(entry_type?: DatastoreEntryType) {
        let entry_type_list: DatastoreEntryType[] = []
        if (typeof entry_type === "undefined") {
            entry_type_list = AllDatastoreEntryTypes
        } else {
            entry_type_list = [entry_type]
        }

        for (let i = 0; i < entry_type_list.length; i++) {
            const row_desc = WatchableInterface.make_root_row(ROOT_NODE_DESC[entry_type_list[i]].label, entry_type_list[i])
            this.tree_table.scrutiny_treetable("add_root_node", ROOT_NODE_DESC[entry_type_list[i]].id, row_desc.tr)
        }
    }

    // Erase the tree. Called on datastore.clear event
    clear_tree(entry_type?: DatastoreEntryType) {
        let entry_type_list: DatastoreEntryType[] = []
        if (typeof entry_type === "undefined") {
            entry_type_list = AllDatastoreEntryTypes
        } else {
            entry_type_list = [entry_type]
        }

        for (let i = 0; i < entry_type_list.length; i++) {
            if (this.tree_table.scrutiny_treetable("node_exists", ROOT_NODE_DESC[entry_type_list[i]].id)) {
                this.tree_table.scrutiny_treetable("delete_node", ROOT_NODE_DESC[entry_type_list[i]].id)
            }
        }
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
