//    varlist.js
//        Variable List widget. Its job is to show all the Watchable items available in the
//        server
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { DatastoreEntryType, AllDatastoreEntryTypes } from "../../datastore"
import { BaseWidget } from "../../base_widget"
import { App } from "../../app"
import * as $ from "jquery"

export class VarListWidget extends BaseWidget {
    /** The container in which to put data. That's our widget Canvas in the UI */
    container: JQuery
    /** The Scrutiny App instance */
    app: App
    /** The instance ID of this widget. */
    instance_id: number
    /** The name attributed the to the tree used to compute a unique HTML ID */
    treename: string
    /** A map mapping element display path with a unique numeric ID within this tree*/
    id_map: Record<string, number>
    /** Counter to generate the next tree ID */
    next_tree_id: number

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

        this.treename = ""
        this.id_map = {}
        this.next_tree_id = 0
    }

    /**
     * Initialize the widget
     */
    initialize(): void {
        const that = this
        this.treename = "varlist_tree_" + this.instance_id
        this.id_map = {}
        this.next_tree_id = 0

        const template_content = this.app.get_template(this, "varlist-content")
        if (template_content.length !== 1) {
            throw "Empty template content"
        }
        this.container.html(template_content[0])

        // Event handlers
        $(document).on("scrutiny.datastore.ready", function (data) {
            that.rebuild_tree() // Todo use data to rebuild only missing nodes
        })

        $(document).on("scrutiny.datastore.clear", function (data) {
            that.rebuild_tree() // Todo : USe data to clear only cleared data
        })

        if (this.app.datastore === null) {
            throw "App not initialized properly"
        }

        // Setup
        this.rebuild_tree()
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
            that.rebuild_tree()
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
        return this.treename + "_" + this.id_map[display_path]
    }

    /**
     *
     * @param parent Parent to read children from
     * @param callback JsTree callback to inform of the result
     */
    fetch_jstree_subnodes(parent: any, callback: Function) {
        // jstree root has id="#"
        if (this.app.datastore === null) {
            throw "Application not initialized properly"
        }
        let node_type_map: Record<DatastoreEntryType, string> = {} as Record<DatastoreEntryType, string>
        node_type_map[DatastoreEntryType.Var] = "var"
        node_type_map[DatastoreEntryType.Alias] = "alias"
        node_type_map[DatastoreEntryType.RPV] = "rpv"

        const that = this
        if (parent.id == "#") {
            let display_path = "/"
            callback([
                {
                    text: "/",
                    id: that.make_node_id(display_path),
                    children: true,
                    li_attr: {
                        display_path: display_path,
                    },
                },
            ])
        } else {
            let jstree_childrens: any[] = []

            for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
                let entry_type = AllDatastoreEntryTypes[i]
                let children = this.app.datastore.get_children(entry_type, parent.li_attr.display_path)
                // Add folders node
                children["subfolders"].forEach(function (subfolder, i) {
                    let separator = parent.li_attr.display_path === "/" ? "" : "/"
                    let display_path = parent.li_attr.display_path + separator + subfolder.name
                    jstree_childrens.push({
                        text: subfolder.name,
                        children: subfolder.has_children, // true if it has children
                        id: that.make_node_id(display_path),
                        li_attr: {
                            display_path: display_path,
                        },
                    })
                })

                // Entries are organized by entry type
                children["entries"][entry_type].forEach(function (entry, i) {
                    jstree_childrens.push({
                        text: entry.default_name,
                        id: that.make_node_id(entry.display_path),
                        li_attr: {
                            display_path: entry.display_path,
                            type: entry.entry_type,
                        },
                        type: node_type_map[entry_type],
                    })
                })
            }

            // Add entries node

            callback(jstree_childrens) // This callback adds the subnodes
        }
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
        //@ts-ignore
        let thetree = $("<div class='varlist-tree'></div>").jstree({
            plugins: ["dnd", "types"], // Drag and drop
            core: {
                //@ts-ignore
                data: function (obj, cb) {
                    that.fetch_jstree_subnodes(obj, cb)
                },
                animation: 75,
                themes: {
                    variant: "small",
                },
            },
            types: {
                alias: {
                    icon: "assets/img/alias-16x16.png",
                },
                var: {
                    icon: "assets/img/var-16x16.png",
                },
                rpv: {
                    icon: "assets/img/rpv-16x16.png",
                },
            },
        })

        // Open root on load complete.
        let root_node_id = this.make_node_id("/")
        thetree.bind("loaded.jstree", function () {
            thetree.jstree().open_node(root_node_id)
        })

        this.get_tree_container().append(thetree)
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
        return ["varlist.css"]
    }

    static templates() {
        return {
            "varlist-content": "templates/varlist-content.html",
        }
    }
}
