import { Datastore, DatastoreEntry, DatastoreEntryType, SubfolderDescription } from "@src/datastore"
import { CLASS_LIVE_EDIT_CONTENT, scrutiny_live_edit, JQueryLiveEdit } from "@scrutiny-live-edit"

$.extend($.fn, { scrutiny_live_edit })

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

export class WatchableInterface {
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
        return WatchableInterface.make_folder_row(subfolder.name, subfolder.display_path, entry_type, extra_col)
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
        return WatchableInterface.make_folder_row(text, "/", entry_type, extra_col)
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
                return entry
            } catch {
                tr.addClass(CLASS_UNAVAILABLE)
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
}
