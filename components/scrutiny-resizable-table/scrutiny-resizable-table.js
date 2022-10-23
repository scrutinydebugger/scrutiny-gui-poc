// @ts-check
"use strict";
(function($) {
    const ATTR_HAS_WIDTH = 'srt-has-width'
    
    const CLASS_TABLE = "srt-table"
    const CLASS_RESIZE_HANDLE = "srt-resize-handle"
    const CLASS_RESIZABLE = "srt-resizable"
    const CLASS_NOWRAP = 'srt-nowrap'
    

    const DATAKEY_OPTIONS = 'srt-options'

    const DEFAULT_OPTIONS = {
        resize_zone_width:4,
        table_width_constrained:false,
        column_min_width:0,
        nowrap:true,
        load_fn: function() {
            throw "No loader defined"
        },
    }

    const RESIZE_HANDLE_TEMPLATE = $(`<div class='${CLASS_RESIZE_HANDLE}' />`)

    /***  Public functions *** */

    function refresh($table){
        _update_sizes($table)
    }

    /***  Private functions *** */
    function init($table, config) {
       // debugger
        let options = $.extend({}, DEFAULT_OPTIONS, config)
        $table.addClass(CLASS_TABLE)
        
        if (options.nowrap){
            $table.addClass(CLASS_NOWRAP)
        }


        $table.data(DATAKEY_OPTIONS, options)
        $table.addClass(CLASS_RESIZABLE)

        let ths = $table.find("thead th")
        if (ths.length == 0){
            throw "<thead> with cells is required for a resizable table"
        }

        ths.css('min-width', ''+options.column_min_width+'px')
        
        if (options.table_width_constrained == false){
            $table.css('width', 'auto')
        } else{
            ths = ths.slice(0, ths.length-1)
        }

        $(document).ready(function(){
            _recompute_col_width($table)
            _update_sizes($table)
        })

        _install_resize_handles($table)
    }

    function _get_options($table){
        return $table.data(DATAKEY_OPTIONS)
    }
    
    function _install_resize_handles($table){
        let options =  _get_options($table)

        let ths = $table.find("thead th")
        if (options.table_width_constrained == true){
            ths = ths.slice(0, ths.length-1)
        }

        ths.attr(`${ATTR_HAS_WIDTH}`, true)

        ths.each(function(){
            let th = $(this)
            let existing_handle = th.find(`.${CLASS_RESIZE_HANDLE}`)
            if (existing_handle.length == 0){
                let handle = RESIZE_HANDLE_TEMPLATE.clone();
                handle.width(options.resize_zone_width)
                let right_offset = options.resize_zone_width/2
                handle.css('right', `-${right_offset}px`)
                th.append(handle)

                let pressed = false;
                let last_cursor_x = null
                handle.on('mousedown',function(e){
                    _make_text_unselectable($table)
                    pressed = true
                    last_cursor_x = e.pageX;
                })

                $(window).on('mouseup',function(e){
                    pressed = false
                    last_cursor_x = null
                    _update_sizes($table);
                })

                $(window).on('mousemove', function(e){
                    let options = _get_options($table)
                    if (pressed){
                        let new_cursor_x = e.pageX
                        let delta_w = (new_cursor_x - last_cursor_x)
                        last_cursor_x = new_cursor_x
                        
                        if (delta_w > 0){
                            _increase_size($table, th, delta_w)
                        }else if(delta_w < 0){
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

    function _increase_size($table, th, delta_w){
        let is_last_col = (th.next().length == 0)
        if (is_last_col){
            delta_w = Math.min(delta_w, _allowed_table_expansion($table))
        }

        // Reduce other cols before expanding this one if we are at max
        if (_is_table_width_max($table) && delta_w>0){
            let width_to_remove = delta_w;
            let width_removed = 0
            let next_th = th.next(`th[${ATTR_HAS_WIDTH}]`)
            while (next_th.length > 0){
                let w = next_th.outerWidth()
                let w2 = Math.max(0, w-width_to_remove)
                next_th.outerWidth(w2)
                _recompute_col_width($table)
                let applied_w = next_th.outerWidth()
                let applied_delta = (w-applied_w)
                width_removed += applied_delta
                width_to_remove -= applied_delta
                next_th = next_th.next(`th[${ATTR_HAS_WIDTH}]`)
                if (width_to_remove == 0){
                    break
                }
            }

            delta_w = width_removed
        }

        let cannot_resize = ( _is_table_width_max($table) && is_last_col && delta_w>0)

        if (!cannot_resize){
            let new_width = th.outerWidth() + delta_w
            th.outerWidth(new_width)
        }
    }

    function _decrease_size($table, th, delta_w){
        let new_width = th.outerWidth() + delta_w
        th.outerWidth(new_width)
        if (delta_w < 0){
            let remaing_delta_w = new_width-th.outerWidth()
            let previous_col = th.prev()
            
            while (previous_col.length > 0 && remaing_delta_w<0){
                let initial_width = previous_col.outerWidth()
                new_width = previous_col.outerWidth() + remaing_delta_w
                previous_col.outerWidth(new_width)
                remaing_delta_w += (initial_width-previous_col.outerWidth())
                previous_col=previous_col.prev()
            }
        }
    }

    function _recompute_col_width($table){
        let options = _get_options($table)
        $table.find(`thead th[${ATTR_HAS_WIDTH}]`).each(function(){
            $(this).width($(this).width())
        })
    }

    function _allowed_table_expansion($table){
        return  Math.max(0, $table.parent().innerWidth() - $table.outerWidth())
    }

    function _is_table_width_max($table){
        return _allowed_table_expansion($table) == 0
    }

    function _make_text_unselectable($table){
        $table.attr('unselectable', 'on')
        .css('user-select', 'none')
    }

    function _make_text_selectable($table){
        $table.attr('unselectable', '')
        .css('user-select', '')
    }

    function _update_sizes($table){
        let table_height = $table.height()
        let column_handles = $table.find(`thead .${CLASS_RESIZE_HANDLE}`)
        
        column_handles.height(table_height)
    }

    // public functions
    const public_funcs = {
        "refresh" : refresh
    }

    $.fn.scrutiny_resizable_table  = function(...args) {
        let hasResults = false
        const results = $(this).map(function() {
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

    // @ts-ignore
})(jQuery)