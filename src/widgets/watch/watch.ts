//    watch.js
//        Watch window widget. Its job is to display the value of watchables items.  Items
//        can be dragged from other watch widget or from VarList widget
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import * as $ from "jquery"
import { BaseWidget } from "../../base_widget"
import { App } from "../../app"
import { DatastoreEntryType } from "../../datastore"

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

    display_table: JQuery
    next_line_instance: number

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

        this.display_table = $()
        this.next_line_instance = 0
    }

    /**
     * Initialize the widget
     */
    initialize() {
        let that = this
        let block = $("<div></div>")
        block.addClass("watch-drop-zone")
        block.css("height", "100%")
        block.css("width", "100%")
        this.container.append(block)
        let display_table = this.app.get_template(this, "display_table")
        block.append(display_table)
        this.display_table = display_table
        this.next_line_instance = 0

        // todo : remove event handler on tabl close?
        $(document).on("dnd_move.vakata", function (e, data) {
            const t = $(data.event.target)
            if (!t.closest(".jstree").length) {
                if (t.closest(".watch-drop-zone").length) {
                    data.helper.find(".jstree-icon").removeClass("jstree-er").addClass("jstree-ok")
                } else {
                    data.helper.find(".jstree-icon").removeClass("jstree-ok").addClass("jstree-er")
                }
            }
        })

        // todo : remove event handler on tabl close?
        $(document).on("dnd_stop.vakata", function (e, data) {
            const t = $(data.event.target)
            const dropzone = t.closest(".watch-drop-zone").first()
            if (dropzone.length) {
                if (that.container.has(dropzone[0]).length) {
                    // Make sure we only take our event. Not the one from other watch window.
                    $(data.data.nodes).each(function (i, nodeid) {
                        // For each dragged node
                        let display_path = $("#" + nodeid).attr("display_path") as string
                        let entry_type = $("#" + nodeid).attr("type") as DatastoreEntryType
                        that.add_var(entry_type, display_path)
                    })
                }
            }
        })

        $(document).on("keydown", function (e) {
            if (e.key === "Delete") {
                // Remove selected lines
                $("table.watch-display tr.selected").each(function () {
                    that.remove_var($(this) as JQuery<HTMLTableRowElement>)
                })
            }
        })
    }

    destroy() {
        const that = this
        // Remove all lines even if not selected
        $("table.watch-display tr").each(function () {
            that.remove_var($(this) as JQuery<HTMLTableRowElement>)
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

        // Homemade selector logic for now. Todo: Do something more fancy
        line.click(function () {
            let temp = true
            if (line.hasClass("selected")) {
                temp = false
            }

            $("table.watch-display tr").removeClass("selected")

            if (temp) {
                line.addClass("selected")
            } else {
                line.removeClass("selected")
            }
        })

        this.display_table.find("tbody").first().append(line)

        let update_callback = function (val: number | null) {
            const newval = val === null ? "N/A" : "" + val
            line.find(".value-cell span").text(newval)
        }
        update_callback(this.app.datastore.get_value(entry_type, display_path))
        this.app.datastore.watch(entry_type, display_path, line_id, update_callback)
    }

    remove_var(line: JQuery<HTMLTableRowElement>) {
        const line_id = line.attr("id")
        if (typeof line_id !== "undefined") {
            this.app.datastore.unwatch_all(line_id)
        }
        line.remove()
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
        return ["watch.css"]
    }

    static templates() {
        return {
            display_table: "templates/display_table.html",
        }
    }
}
