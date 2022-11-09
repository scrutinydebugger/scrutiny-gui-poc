import * as $ from "jquery"

// @ts-check
"use strict";

const ATTR_HAS_WIDTH = 'srt-has-width'

const CLASS_TABLE = "srt-table"
const CLASS_RESIZE_HANDLE = "srt-resize-handle"
const CLASS_NOWRAP = 'srt-nowrap'
const CLASS_HANDLE_ACTIVE = 'srt-handle-active'
const CLASS_RESIZING = 'srt-resizing'

const DATAKEY_OPTIONS = 'srt-options'

const DEFAULT_OPTIONS = {
    table_width_constrained: false,
    column_min_width: 0,
    nowrap: true,
    load_fn: function () {
        throw "No loader defined"
    },
}

const RESIZE_HANDLE_TEMPLATE = $(`<div class='${CLASS_RESIZE_HANDLE}' />`)

/***  Public functions *** */

function refresh($table) {
    _update_sizes($table)
}

/***  Private functions *** */
function init($table, config) {
    let options = $.extend({}, DEFAULT_OPTIONS, config)
    $table.addClass(CLASS_TABLE)

    if (options.nowrap) {
        $table.addClass(CLASS_NOWRAP)
    }


    $table.data(DATAKEY_OPTIONS, options)

    let ths = $table.find("thead th")
    if (ths.length == 0) {
        throw "<thead> with cells is required for a resizable table"
    }

    ths.css('min-width', '' + options.column_min_width + 'px')

    if (options.table_width_constrained == false) {
        $table.css('width', 'auto')
    } else {
        ths = ths.slice(0, ths.length - 1)
    }

    $(document).ready(function () {
        _recompute_col_width($table)
        _update_sizes($table)
    })

    _install_resize_handles($table)
}

function _get_options($table) {
    return $table.data(DATAKEY_OPTIONS)
}

function _install_resize_handles($table) {
    let options = _get_options($table)

    let ths = $table.find("thead th")
    if (options.table_width_constrained == true) {
        ths = ths.slice(0, ths.length - 1)
    }

    ths.attr(`${ATTR_HAS_WIDTH}`, true)

    ths.each(function () {
        let th = $(this)
        let existing_handle = th.find(`.${CLASS_RESIZE_HANDLE}`)
        if (existing_handle.length == 0) {
            let handle = RESIZE_HANDLE_TEMPLATE.clone();
            th.append(handle)

            let pressed = false;
            let last_cursor_x = null
            handle.on('mousedown', function (e) {
                _make_text_unselectable($table)
                pressed = true
                $table.addClass(CLASS_RESIZING)
                $(this).addClass(CLASS_HANDLE_ACTIVE)
                last_cursor_x = e.pageX;
            })

            $(window).on('mouseup', function (e) {
                if (pressed) {
                    $table.removeClass(CLASS_RESIZING)
                    $table.find('thead').find(`.${CLASS_RESIZE_HANDLE}`).removeClass(CLASS_HANDLE_ACTIVE)
                    last_cursor_x = null
                    _update_sizes($table);
                    pressed = false
                }
            })

            $(window).on('mousemove', function (e) {
                if (pressed) {
                    let new_cursor_x = e.pageX
                    let delta_w = (new_cursor_x - last_cursor_x)
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

    _update_sizes($table);
}

function _increase_size($table, th, delta_w) {
    delta_w = Math.abs(delta_w)
    let options = _get_options($table)
    let is_last_col = false
    let extra_w_for_last_col = 0
    if (!options.table_width_constrained) {
        let is_last_col = (th.next().length == 0)
        if (is_last_col) {
            delta_w = Math.min(delta_w, _allowed_table_expansion($table))
        }
    }

    // Reduce other cols before expanding this one if we are at max
    if (!_table_can_grow($table)) {
        let width_to_remove = delta_w;
        let width_removed = 0
        let next_th = th.next(`th[${ATTR_HAS_WIDTH}]`)
        while (next_th.length > 0) {
            let w = next_th.outerWidth()
            let w2 = Math.max(0, w - width_to_remove)
            next_th.outerWidth(w2)
            _recompute_col_width($table)
            let applied_w = next_th.outerWidth()
            let applied_delta = (w - applied_w)
            width_removed += applied_delta
            width_to_remove -= applied_delta
            next_th = next_th.next(`th[${ATTR_HAS_WIDTH}]`)
            if (width_to_remove == 0) {
                break
            }
        }

        delta_w = width_removed
        if (options.table_width_constrained) {    // We have another column that can be resized by the browser
            extra_w_for_last_col = width_to_remove
        }
    }

    let cannot_resize = (!_table_can_grow($table) && is_last_col)

    if (!cannot_resize) {
        let new_width = th.outerWidth() + delta_w
        th.outerWidth(new_width)

        if (extra_w_for_last_col > 0.1) {

            let last_col = $table.find('thead th:last-child()')
            let last_col_initial_width = last_col.outerWidth()
            if (last_col.length == 0) {
                throw "Can't find last column"
            }
            th.outerWidth(th.outerWidth() + extra_w_for_last_col)
            let unapplied_width_on_last_col = extra_w_for_last_col - (last_col_initial_width - last_col.outerWidth())
            th.outerWidth(th.outerWidth() - unapplied_width_on_last_col);   // Fixme. Last column can jiggle here.
        }
    }
}

function _decrease_size($table, th, delta_w) {
    delta_w = -Math.abs(delta_w)
    let options = _get_options($table)

    let new_width = th.outerWidth() + delta_w
    th.outerWidth(new_width)
    let remaing_delta_w = new_width - th.outerWidth()
    let previous_col = th.prev()

    while (previous_col.length > 0 && remaing_delta_w < 0) {
        let initial_width = previous_col.outerWidth()
        new_width = previous_col.outerWidth() + remaing_delta_w
        previous_col.outerWidth(new_width)
        remaing_delta_w += (initial_width - previous_col.outerWidth())
        previous_col = previous_col.prev()
    }


    if (options.table_width_constrained) {
        let next_th = th.next(`th[${ATTR_HAS_WIDTH}]`)
        if (next_th.length > 0) {
            next_th.outerWidth(next_th.outerWidth() - (delta_w - remaing_delta_w))
        }
    }
}

function _recompute_col_width($table) {
    $table.find(`thead th[${ATTR_HAS_WIDTH}]`).each(function () {
        $(this).width($(this).width())
    })
}

function _allowed_table_expansion($table) {
    let options = _get_options($table)
    if (options.table_width_constrained) {
        return 0
    }
    return Math.max(0, $table.parent().innerWidth() - $table.outerWidth())
}

function _table_can_grow($table) {
    return _allowed_table_expansion($table) > 0
}

function _make_text_unselectable($table) {
    $table.attr('unselectable', 'on')
        .css('user-select', 'none')
}

function _make_text_selectable($table) {
    $table.attr('unselectable', '')
        .css('user-select', '')
}

function _update_sizes($table) {
    let first_row = $table.find('tr:visible:first')
    let last_row = $table.find('tr:visible:last')
    let table_height = (last_row.offset().top + last_row.outerHeight()) - first_row.offset().top

    let thead = $table.find('thead')
    let column_handles = thead.find(`.${CLASS_RESIZE_HANDLE}`)
    let th = thead.find('th').first()
    let top = -(th.outerHeight() - th.innerHeight()) / 2
    column_handles.outerHeight(table_height)
    column_handles.css('top', `${top}px`)

    column_handles.each(function () {
        let handle = $(this)
        let right_offset = 0;
        let border_avg_width = (th.outerWidth() - th.innerWidth()) / 2
        right_offset = handle.width() / 2 + border_avg_width / 2 // half handle size + half cell border size
        handle.css('right', `-${right_offset}px`)
    })
}

// public functions
const public_funcs = {
    "refresh": refresh
}


export function scrutiny_treetable(...args) {
    let hasResults = false
    const results = $(this).map(function () {
        const $table = $(this)

        // Jquery plugin like approach.
        if (args.length < 1) throw "Missing arguments"

        if (typeof args[0] === "string") {
            const funcname = args[0]
            if (!public_funcs.hasOwnProperty(funcname)) {
                throw "Unknown function " + funcname
            }
            const result = public_funcs[funcname]($table, ...args.slice(1))
            if (typeof result !== "undefined") {
                hasResults = true
                return result
            }
        } else {
            init($table, ...args)
        }
    })

    // When no result were provided, return the same `this` that we received
    if (!hasResults) {
        return this
    }
    // optionnaly, when there was only one item targeted, return the result
    // directly
    else if (results.length === 1) {
        return results[0]
    }
    // otherwise return the jQuery mapped results.
    else {
        return results
    }
}