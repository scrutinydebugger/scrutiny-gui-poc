// @ts-check
"use strict";
(function($) {
    const CLASS_TABLE = "srt-table"
    const CLASS_RESIZE_HANDLE = "srt-resize-handle"
    const CLASS_RESIZABLE = "srt-resizable"
    const CLASS_NOWRAP = 'srt-nowrap'

    const DATAKEY_OPTIONS = 'srt-options'

    const DEFAULT_OPTIONS = {
        resize_zone_width:4,
        table_width_constrained:false,
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
        _set_resizable($table)
    }

    function _get_options($table){
        return $table.data(DATAKEY_OPTIONS)
    }

    function _set_resizable($table){
        let options =  _get_options($table)

        $table.addClass(CLASS_RESIZABLE)

        let ths = $table.find("thead th")
        if (ths.length == 0){
            throw "<thead> with cells is required for a resizable table"
        }
        
        if (options.table_width_constrained == false){
            $table.css('width', 'auto')
        } else{
            ths = ths.slice(0, ths.length-1)
        }

        $(document).ready(function(){
            ths.each(function(){
                $(this).width($(this).width())
            })

            _update_sizes($table)
        })

        _install_resize_handles($table)
    }
    
    function _install_resize_handles($table){
        let options =  _get_options($table)

        let ths = $table.find("thead th")
        if (options.table_width_constrained == true){
            ths = ths.slice(0, ths.length-1)
        }

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
                let mouse_start_x = null
                let col_start_w = null;
                handle.on('mousedown',function(e){
                    _make_text_unselectable($table)
                    pressed = true
                    mouse_start_x = e.pageX;
                    col_start_w = th.width();
                })

                $(window).on('mouseup',function(e){
                    pressed = false
                    _update_sizes($table);
                })

                $(window).on('mousemove', function(e){
                    if (pressed){
                        let delta_x = e.pageX - mouse_start_x
                        let max_delta = $(window).width() - mouse_start_x
                        delta_x = Math.min(max_delta, delta_x)
                        th.width(col_start_w + delta_x)
                        _make_text_selectable($table)
                    }
                })

            }
        })

        _update_sizes($table);
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