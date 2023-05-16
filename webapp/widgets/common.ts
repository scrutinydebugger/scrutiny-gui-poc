import { Datastore, DatastoreEntry, DatastoreEntryType, SubfolderDescription } from "@src/datastore"
import { CLASS_LIVE_EDIT_CONTENT, scrutiny_live_edit, JQueryLiveEdit } from "@scrutiny-live-edit"
import { scrutiny_objtextbox, JQueryObjTextbox, PluginOptions as ObjTextboxOptions } from "@scrutiny-objtextbox"
import { get_drag_data_from_drop_event } from "@scrutiny-treetable"

$.extend($.fn, { scrutiny_live_edit })
$.extend($.fn, { scrutiny_objtextbox })

export const ATTR_ENTRY_TYPE = "entry_type"
export const ATTR_DISPLAY_PATH = "display_path"

export const CLASS_NAME_COL = "name_col"
export const CLASS_VAL_COL = "val_col"
export const CLASS_TYPE_COL = "type_col"

export const CLASS_VAR_ICON = "icon_var"
export const CLASS_ALIAS_ICON = "icon_alias"
export const CLASS_RPV_ICON = "icon_rpv"
export const CLASS_FOLDER_ICON = "icon_folder"

export const CLASS_ENTRY_ROW = "entry_row"
export const CLASS_FOLDER_ROW = "folder_row"
export const CLASS_UNAVAILABLE = "unavailable"

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryCell = JQuery<HTMLTableCellElement>

interface ScrutinyResizableTable extends JQuery<HTMLTableElement> {
    scrutiny_resizable_table: Function
}
interface ScrutinyTreeTable extends ScrutinyResizableTable {
    scrutiny_treetable: Function
}

export interface EntryRowDetails {
    tr: JQueryRow
    td_name: JQueryLiveEdit<HTMLTableCellElement>
    td_val: JQueryLiveEdit<HTMLTableCellElement> | null
    td_type: JQueryLiveEdit<HTMLTableCellElement> | null
}

export interface FolderRowDetails {
    tr: JQueryRow
    td_name: JQueryLiveEdit<HTMLTableCellElement>
}

export interface NameEntryPair {
    entry: DatastoreEntry
    name: string
}

function get_icon_class(entry: DatastoreEntry): string {
    let icon_class = null
    if (entry.entry_type == DatastoreEntryType.Var) {
        icon_class = CLASS_VAR_ICON
    } else if (entry.entry_type == DatastoreEntryType.Alias) {
        icon_class = CLASS_ALIAS_ICON
    } else if (entry.entry_type == DatastoreEntryType.RPV) {
        icon_class = CLASS_RPV_ICON
    } else {
        throw "Unknown entry type"
    }

    return icon_class
}

export class WatchableTextbox {
    static make(element: JQueryObjTextbox, datastore: Datastore, readonly = false): JQueryObjTextbox {
        if (!element.is("div")) {
            throw "Require a div element"
        }

        const default_val = readonly ? "" : "0"
        const input_template = $("<input type='text' />") as JQuery<HTMLInputElement>
        if (readonly) {
            input_template.attr("readonly", "readonly")
        }

        const objtextbox_options: ObjTextboxOptions = {
            render_func: function (arg: object) {
                const obj = arg as NameEntryPair
                const icon_class = get_icon_class(obj.entry)
                return $(`<div class="textbox-watchable"><div class="entry_icon ${icon_class}"></div><span>${obj.name}</span></div>`)
            },
            input_template: input_template,
        }

        element.on("otb.obj_unset", function () {
            element.scrutiny_objtextbox("set_text", default_val)
        })

        element.on("otb.select", function () {
            element.find(".textbox-watchable").addClass("selected")
        })

        element.on("otb.unselect", function () {
            element.find(".textbox-watchable").removeClass("selected")
        })

        element.on("dragover", function (e) {
            e.preventDefault()
        })

        element.on("drop", function (e) {
            const drag_data = get_drag_data_from_drop_event(e) // Will have a meaningful value only if it comes from a treetable, null otherwise
            if (drag_data != null) {
                const table = $(`#${drag_data.source_table_id}`) as ScrutinyTreeTable
                const row = table.scrutiny_treetable("get_nodes", drag_data.dragged_row_id)
                const entry = WatchableTableInterface.get_entry_from_row(datastore, row)
                if (entry == null) {
                    element.scrutiny_objtextbox("set_text", default_val)
                } else {
                    const obj: NameEntryPair = {
                        entry: entry,
                        name: WatchableTableInterface.get_name(row),
                    }
                    element.scrutiny_objtextbox("set_obj", obj)
                }

                e.stopPropagation()
            }
        })

        element.scrutiny_objtextbox(objtextbox_options, default_val)
        return element
    }

    static get(element: JQueryObjTextbox): NameEntryPair | string {
        if (element.scrutiny_objtextbox("is_obj_mode")) {
            return element.scrutiny_objtextbox("get_obj") as NameEntryPair
        } else {
            return element.scrutiny_objtextbox("get_text") as string
        }
    }
}

export class WatchableTableInterface {
    static get_display_path(row: JQueryRow): string {
        const dispaly_path = row.attr(ATTR_DISPLAY_PATH)
        if (typeof dispaly_path === "undefined") {
            throw "No display path on row"
        }
        return dispaly_path
    }

    static get_entry_type(row: JQueryRow): DatastoreEntryType {
        const entry_type = row.attr(ATTR_ENTRY_TYPE)
        if (typeof entry_type == "undefined") {
            throw "No display path on row"
        }
        return entry_type as DatastoreEntryType
    }

    static get_value_cell(row: JQueryRow): JQueryLiveEdit<HTMLTableCellElement> {
        const cell = row.find(`td.${CLASS_VAL_COL}`) as JQueryLiveEdit<HTMLTableCellElement>
        if (cell.length == 0) {
            throw "No value column on row"
        }
        return cell
    }

    static get_name_cell(row: JQueryRow): JQueryLiveEdit<HTMLTableCellElement> {
        const cell = row.find(`td.${CLASS_NAME_COL}`) as JQueryLiveEdit<HTMLTableCellElement>
        if (cell.length == 0) {
            throw "No name column on row"
        }
        return cell
    }

    static get_name(row: JQueryRow): string {
        const cell = WatchableTableInterface.get_name_cell(row)
        return cell.text()
    }

    static get_type_cell(row: JQueryRow): JQueryLiveEdit<HTMLTableCellElement> {
        const cell = row.find(`td.${CLASS_TYPE_COL}`) as JQueryLiveEdit<HTMLTableCellElement>
        if (cell.length == 0) {
            throw "No name column on row"
        }
        return cell
    }

    static is_entry_row(row: JQueryRow): boolean {
        return row.hasClass(CLASS_ENTRY_ROW)
    }

    static is_folder_row(row: JQueryRow): boolean {
        return row.hasClass(CLASS_FOLDER_ROW)
    }

    static get_row_filter_by_entry_type(entry_type: DatastoreEntryType): string {
        return `tr[${ATTR_ENTRY_TYPE}="${entry_type}"]`
    }

    static make_entry_row(entry: DatastoreEntry, name: string, value_col: boolean, typecol: boolean) {
        const output = {} as EntryRowDetails

        output.tr = $(`<tr class="${CLASS_ENTRY_ROW}"></tr>`)
        output.tr.attr(ATTR_ENTRY_TYPE, entry.entry_type)
        output.tr.attr(ATTR_DISPLAY_PATH, entry.display_path)

        let icon_class = get_icon_class(entry)

        output.td_name = $(
            `<td class="${CLASS_NAME_COL}"><div class="entry_icon ${icon_class}"></div><div class="${CLASS_LIVE_EDIT_CONTENT}">${name}</div></td>`
        ) as JQueryLiveEdit<HTMLTableCellElement>
        output.tr.append(output.td_name)
        output.td_val = null
        output.td_type = null

        if (value_col) {
            const val = entry.get_value()
            const valstr = val == null ? "N/A" : val.toString()
            output.td_val = $(
                `<td class="${CLASS_VAL_COL}"><div class="${CLASS_LIVE_EDIT_CONTENT}">${valstr}</div></td>`
            ) as JQueryLiveEdit<HTMLTableCellElement>
            output.tr.append(output.td_val)
        }

        if (typecol) {
            output.td_type = $(
                `<td class="${CLASS_TYPE_COL}"><div class="${CLASS_LIVE_EDIT_CONTENT}">${entry.datatype}</div></td>`
            ) as JQueryLiveEdit<HTMLTableCellElement>
            output.tr.append(output.td_type)
        }

        return output
    }

    static make_folder_row_from_datastore_folder(
        subfolder: SubfolderDescription,
        entry_type: DatastoreEntryType,
        extra_col: number = 0
    ): FolderRowDetails {
        return WatchableTableInterface.make_folder_row(subfolder.name, subfolder.display_path, entry_type, extra_col)
    }

    static make_folder_row(name: string, display_path: string, entry_type: DatastoreEntryType, extra_col: number = 0): FolderRowDetails {
        const output = {} as FolderRowDetails

        output.tr = $(`<tr class="${CLASS_FOLDER_ROW}"></tr>`) as JQueryRow
        output.tr.attr(ATTR_DISPLAY_PATH, display_path)
        output.tr.attr(ATTR_ENTRY_TYPE, entry_type)

        output.td_name = $(
            `<td class="${CLASS_NAME_COL}"><div class="entry_icon ${CLASS_FOLDER_ICON}"></div><div class="${CLASS_LIVE_EDIT_CONTENT}">${name}</div></td>`
        ) as JQueryLiveEdit<HTMLTableCellElement>
        output.tr.append(output.td_name)

        for (let i = 0; i < extra_col; i++) {
            output.tr.append($("<td></td>"))
        }
        return output
    }

    static make_root_row(text: string, entry_type: DatastoreEntryType, extra_col: number = 0): FolderRowDetails {
        return WatchableTableInterface.make_folder_row(text, "/", entry_type, extra_col)
    }

    /**
     * Fetch the datastore entry based on the metadata encapsulated in a table row created by this module
     * @param datastore The datastore
     * @param tr The row from which to take data
     * @returns The datastore entry referenced by the table row
     */
    static get_entry_from_row(datastore: Datastore, tr: JQueryRow): DatastoreEntry | null {
        const display_path = tr.attr(ATTR_DISPLAY_PATH) as string | undefined
        const entry_type = tr.attr(ATTR_ENTRY_TYPE) as DatastoreEntryType | undefined
        if (typeof display_path !== "undefined" && typeof entry_type !== "undefined") {
            try {
                const entry = datastore.get_entry(entry_type, display_path)
                this.mark_available(tr)
                return entry
            } catch {
                this.mark_unavailable(tr)
            }
        } else {
            throw "Missing property on row"
        }

        return null
    }

    /**
     * Sets the value displayed by the row
     * @param tr The row
     * @param val The value to set
     */
    static set_entry_row_display_value(tr: JQueryRow, val: string | number) {
        tr.find(`td.${CLASS_VAL_COL} ${CLASS_LIVE_EDIT_CONTENT}`).html(val.toString())
    }

    static mark_unavailable(tr: JQueryRow) {
        tr.addClass(CLASS_UNAVAILABLE)
    }

    static mark_available(tr: JQueryRow) {
        tr.removeClass(CLASS_UNAVAILABLE)
    }
}
