//    scrutiny-resizable-table.ts
//        A JQuery plugin that can be added on a Table element to make the columns resizable
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import * as $ from "jquery"

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
type JQueryCell = JQuery<HTMLTableCellElement>

/** Tells if a cell has an explicit width value */
const ATTR_HAS_WIDTH = "srt-has-width"

/** Class put on every tables that is enabled by this plugin */
const CLASS_TABLE = "srt-table"
/** Class put on every column handle */
const CLASS_RESIZE_HANDLE = "srt-resize-handle"
/** Indicates that the text in the table should not wrap */
const CLASS_NOWRAP = "srt-nowrap"
/** Class put on a handle when its being dragged */
const CLASS_HANDLE_ACTIVE = "srt-handle-active"
/** Class put on the table when a resize is in progress (column handle being dragged) */
const CLASS_RESIZING = "srt-resizing"

/** Data key to store the plugin options */
const DATAKEY_OPTIONS = "srt-options"

const DEFAULT_OPTIONS = {
    table_width_constrained: false,
    column_min_width: 0,
    nowrap: true,
}

type PluginOptionsFull = typeof DEFAULT_OPTIONS
export type PluginOptions = Partial<PluginOptionsFull>

const RESIZE_HANDLE_TEMPLATE = $(`<div class='${CLASS_RESIZE_HANDLE}' />`)

/***  Public functions *** */

/**
 * Refresh the plugin so that its visual behavior is adjusted. Since it uses absolutes positioning, 
 * we can't rely on the browser to auto-update its position
 * @param $table The table
 */
function refresh($table: JQueryTable) {
    _update_sizes($table)
}

/***  Private functions *** */

function _get_options($table: JQueryTable): PluginOptionsFull {
    return $table.data(DATAKEY_OPTIONS) as PluginOptionsFull
}

/**
 * Adds some floating divs over the table columns separators using absolute positioning.
 * These handles are used to grab the table and highlight the separator. 
 * Their height needs to be adjusted when the table grows or shrink vertically as the browser won't do it
 * because of absolute positions. Calling refresh() does this update
 * @param $table The table
 */
function _install_resize_handles($table: JQueryTable): void {
    const options = _get_options($table)

    let ths = $table.find("thead th") as JQueryCell
    if (options.table_width_constrained == true) {
        ths = ths.slice(0, ths.length - 1)
    }

    ths.attr(`${ATTR_HAS_WIDTH}`, "1")

    ths.each(function () {
        const th = $(this)
        const existing_handle = th.find(`.${CLASS_RESIZE_HANDLE}`) as JQueryCell
        if (existing_handle.length == 0) {
            let handle = RESIZE_HANDLE_TEMPLATE.clone()
            th.append(handle)

            let pressed = false
            let last_cursor_x: number | null = null
            handle.on("mousedown", function (e) {
                //  Click on a column separator
                _make_text_unselectable($table)
                pressed = true
                $table.addClass(CLASS_RESIZING)
                $(this).addClass(CLASS_HANDLE_ACTIVE)
                last_cursor_x = e.pageX
            })

            $(window).on("mouseup", function (e) {
                //  Release of a column separator
                if (pressed) {
                    $table.removeClass(CLASS_RESIZING)
                    $table.find("thead").find(`.${CLASS_RESIZE_HANDLE}`).removeClass(CLASS_HANDLE_ACTIVE)
                    last_cursor_x = null
                    _update_sizes($table)
                    pressed = false
                }
            })

            $(window).on("mousemove", function (e) {
                if (pressed && last_cursor_x != null) {
                    // Moving a column separator
                    const new_cursor_x = e.pageX
                    const delta_w = new_cursor_x - last_cursor_x
                    last_cursor_x = new_cursor_x

                    if (delta_w > 0) {
                        _increase_size($table, th, delta_w)
                    } else if (delta_w < 0) {
                        _decrease_size($table, th, delta_w)
                    }

                    _recompute_col_width($table)
                    _make_text_selectable($table)
                }
            })
        }
    })

    _update_sizes($table)
}

/**
 * Increase the size of a cell by the given number of pixel.
 * @param $table The table
 * @param th The cell to increase the size
 * @param delta_w The width to increase (pixel). This value is a delta
 */
function _increase_size($table: JQueryTable, th: JQueryCell, delta_w: number): void {
    if (th.length != 1) {
        throw "Expect a single cell"
    }
    delta_w = Math.abs(delta_w)
    const options = _get_options($table)
    let is_last_col = false
    let extra_w_for_last_col = 0
    if (!options.table_width_constrained) {
        let is_last_col = th.next().length == 0
        if (is_last_col) {
            delta_w = Math.min(delta_w, _allowed_table_expansion($table))
        }
    }

    // Reduce other cols before expanding this one if we are at max
    if (!_table_can_grow($table)) {
        let width_to_remove = delta_w
        let width_removed = 0
        let next_th = th.next(`th[${ATTR_HAS_WIDTH}]`)
        while (next_th.length == 1) {
            const w = next_th.outerWidth() as number
            const w2 = Math.max(0, w - width_to_remove)
            next_th.outerWidth(w2)
            _recompute_col_width($table)
            const applied_w = next_th.outerWidth() as number
            const applied_delta = w - applied_w
            width_removed += applied_delta
            width_to_remove -= applied_delta
            next_th = next_th.next(`th[${ATTR_HAS_WIDTH}]`)
            if (width_to_remove == 0) {
                break
            }
        }

        delta_w = width_removed
        if (options.table_width_constrained) {
            // We have another column that can be resized by the browser
            extra_w_for_last_col = width_to_remove
        }
    }

    let cannot_resize = !_table_can_grow($table) && is_last_col

    if (!cannot_resize) {
        const new_width = (th.outerWidth() as number) + delta_w
        th.outerWidth(new_width)

        if (extra_w_for_last_col > 0.1) {
            const last_col = $table.find("thead th:last-child()")
            const last_col_initial_width = last_col.outerWidth() as number
            if (last_col.length == 0) {
                throw "Can't find last column"
            }
            th.outerWidth((th.outerWidth() as number) + extra_w_for_last_col)
            const unapplied_width_on_last_col = extra_w_for_last_col - (last_col_initial_width - (last_col.outerWidth() as number))
            th.outerWidth((th.outerWidth() as number) - unapplied_width_on_last_col) // Fixme. Last column can jiggle here.
        }
    }
}

/**
 * Decrease the size of a cell by the given number of pixel.
 * @param $table The table
 * @param th The cell to decrease the size
 * @param delta_w The width to decrease (pixel). This value is a delta
 */
function _decrease_size($table: JQueryTable, th: JQueryCell, delta_w: number): void {
    if (th.length != 1) {
        throw "Expect a single cell"
    }

    delta_w = -Math.abs(delta_w)
    const options = _get_options($table)

    let new_width = (th.outerWidth() as number) + delta_w
    th.outerWidth(new_width)
    let remaining_delta_w = new_width - (th.outerWidth() as number)
    let previous_col = th.prev()

    while (previous_col.length > 0 && remaining_delta_w < 0) {
        let initial_width = previous_col.outerWidth() as number
        new_width = (previous_col.outerWidth() as number) + remaining_delta_w
        previous_col.outerWidth(new_width)
        remaining_delta_w += initial_width - (previous_col.outerWidth() as number)
        previous_col = previous_col.prev()
    }

    if (options.table_width_constrained) {
        let next_th = th.next(`th[${ATTR_HAS_WIDTH}]`)
        if (next_th.length > 0) {
            next_th.outerWidth((next_th.outerWidth() as number) - (delta_w - remaining_delta_w))
        }
    }
}

/**
 * Update the width of the columns embedded as a header cell property so that they represent their real size.
 * Browsers allows their sum to be bigger than the total table width, causing a mismatch between the encoded value and the display
 * @param $table The table
 */
function _recompute_col_width($table: JQueryTable): void {
    $table.find(`thead th[${ATTR_HAS_WIDTH}]`).each(function () {
        $(this).width($(this).width() as number)
    })
}

/**
 * Returns by how many pixels the table can still grows
 * @param $table The table
 * @returns Expansion margin in pixels
 */
function _allowed_table_expansion($table: JQueryTable): number {
    const options = _get_options($table)
    if (options.table_width_constrained) {
        return 0
    }
    const table_parent = $table.parent()
    return Math.max(0, (table_parent.innerWidth() as number) - ($table.outerWidth() as number))
}

/**
 * Tells if a table is at maximum size or not.
 * @param $table The table
 * @returns True if the table can grow
 */
function _table_can_grow($table: JQueryTable): boolean {
    return _allowed_table_expansion($table) > 0
}

/**
 * Make the text in the table unselectable. Useful to avoid glitches while resizing the columns
 * @param $table The table
 */
function _make_text_unselectable($table: JQueryTable): void {
    $table.attr("unselectable", "on").css("user-select", "none")
}

/**
 * Make the text in the table selectable
 * @param $table The table
 */
function _make_text_selectable($table: JQueryTable): void {
    $table.attr("unselectable", "").css("user-select", "")
}

/**
 * Recompute all required size parameter in the table. 
 * Necessary since we use absolute positioning
 * @param $table The table
 */
function _update_sizes($table: JQueryTable): void {
    const first_row = $table.find("tr:visible:first") as JQueryRow
    const last_row = $table.find("tr:visible:last") as JQueryRow
    let table_height = 0
    if (last_row.length > 0 && first_row.length > 0) {
        //@ts-ignore
        table_height = last_row.offset().top + last_row.outerHeight() - first_row.offset().top
    }

    const thead = $table.find("thead") as JQuery<HTMLTableSectionElement>
    let column_handles = thead.find(`.${CLASS_RESIZE_HANDLE}`)
    const first_th = thead.find("th").first() as JQueryCell
    const top = -((first_th.outerHeight() as number) - (first_th.innerHeight() as number)) / 2
    column_handles.outerHeight(table_height)
    column_handles.css("top", `${top}px`)

    column_handles.each(function () {
        const handle = $(this) as JQuery<HTMLDivElement>
        const border_avg_width = ((first_th.outerWidth() as number) - (first_th.innerWidth() as number)) / 2
        const right_offset = (handle.width() as number) / 2 + border_avg_width / 2 // half handle size + half cell border size
        handle.css("right", `-${right_offset}px`)
    })
}

/**
 * Initialize the plugin on a DOM table
 * @param $table The table
 * @param config The plugin configuration
 */
function init($table: JQueryTable, config: PluginOptions): void {
    let options = $.extend({}, DEFAULT_OPTIONS, config)
    $table.addClass(CLASS_TABLE)

    if (options.nowrap) {
        $table.addClass(CLASS_NOWRAP)
    }

    $table.data(DATAKEY_OPTIONS, options)

    let ths = $table.find("thead th") as JQueryCell
    if (ths.length == 0) {
        throw "<thead> with cells is required for a resizable table"
    }

    ths.css("min-width", "" + options.column_min_width + "px")

    if (options.table_width_constrained == false) {
        $table.css("width", "auto")
    } else {
        ths = ths.slice(0, ths.length - 1)
    }

    $(document).ready(function () {
        _recompute_col_width($table)
        _update_sizes($table)
    })

    _install_resize_handles($table)
}

// public functions
const public_funcs = {
    refresh: refresh,
}

/**
 * Call the plugin on the given table.
 * @param args Plugin parameters. Either a configuration for initialization or a function name + function params on a already initialized plugin
 * @returns The JQuery table unless a function with a return value is requested
 */
export function scrutiny_resizable_table(...args: any[]) {
    let hasResults = false
    //@ts-ignore
    const results = $(this).map(function () {
        const $table = $(this)

        // Jquery plugin like approach.
        if (args.length < 1) throw "Missing arguments"

        if (typeof args[0] === "string") {
            const funcname = args[0]
            if (!public_funcs.hasOwnProperty(funcname)) {
                throw "Unknown function " + funcname
            }
            //@ts-ignore
            const result = public_funcs[funcname]($table, ...args.slice(1))
            if (typeof result !== "undefined") {
                hasResults = true
                return result
            }
        } else {
            init($table, args[0])
        }
    })

    // When no result were provided, return the same `this` that we received
    if (!hasResults) {
        //@ts-ignore
        return this
    }
    // optionally, when there was only one item targeted, return the result
    // directly
    else if (results.length === 1) {
        return results[0]
    }
    // otherwise return the jQuery mapped results.
    else {
        return results
    }
}
