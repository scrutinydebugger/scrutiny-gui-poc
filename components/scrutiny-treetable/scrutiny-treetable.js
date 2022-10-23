// @ts-check
"use strict";
(function($) {
    // Scrutiny Tree Table plugin.
    // Custom made tree-table widget because all the one out there were either behind a paid license
    // or buggy and/or deprecated and/or not tailored to our need.

    const ATTR_ID = "stt-id"
    const ATTR_PARENT = "stt-parent-id"
    const ATTR_LEVEL = "stt-level"
    const ATTR_CHILDREN_COUNT = "stt-children-count"
    const ATTR_CHILDREN_LOADED = "stt-children-loaded"
    const ATTR_ROOT = "stt-root"

    const CLASS_TABLE = "stt-table"
    const CLASS_SPACER = "stt-spacer"
    const CLASS_EXPANDER = "stt-expander"
    const CLASS_EXPANDER_OPENED = "stt-expander-opened"
    const CLASS_EXPANDER_CLOSED = "stt-expander-closed"

    const EVENT_COLLAPSED = 'stt.collapsed'
    const EVENT_EXPANDED = 'stt.expanded'
  
    const DEFAULT_OPTIONS = {
        indent: 10,
        expander_size: 12,
        col_index: 1,
        load_fn: function() {
            throw "No loader defined"
        },
    }

    const SPACER_TEMPLATE = $(`<span class='${CLASS_SPACER}'></span>`)
    const EXPANDER_OPENED_TEMPLATE = $(`<div class='${CLASS_EXPANDER} ${CLASS_EXPANDER_OPENED}' />`)
    const EXPANDER_CLOSED_TEMPLATE = $(`<div class='${CLASS_EXPANDER} ${CLASS_EXPANDER_CLOSED}' />`)

    /***  Public functions *** */

    function add_root_node($table, node_id, tr) {
        _add_node($table, null, node_id, tr)
        _load_or_show_children($table, tr)
    }

    function get_children($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        return _get_children($table, tr)
    }

    function get_parent($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        _get_parent($table, tr)
    }

    // eslint-disable-next-line no-unused-vars
    function get_children_count($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        return _get_children_count(tr)
    }

    function delete_node($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        _delete_node($table, tr)
    }

    function expand_node($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        if (_is_visible(tr)) {
            _expand_row($table, tr)
        }
    }

    function expand_all($table) {
        _expand_all($table)
    }

    function collapse_node($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        _collapse_row($table, tr)
    }

    function collapse_all($table, arg) {
        _collapse_all($table, arg)
    }

    // eslint-disable-next-line no-unused-vars
    function is_root($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        return _is_root(tr)
    }

    /***  Private functions *** */

    // Basic accessors
    function _get_node_id(tr) {
        return tr.attr(ATTR_ID)
    }

    function _set_node_id(tr, node_id) {
        return tr.attr(ATTR_ID, node_id)
    }

    function _is_child_of(tr, parent_id) {
        return (
            typeof tr.attr(ATTR_PARENT) !== "undefined" &&
            tr.attr(ATTR_PARENT) === parent_id
        )
    }

    function _find_row($table, node_id) {
        let node_cache = $table.data("node_cache")
        if (node_cache.hasOwnProperty(node_id)) {
            return node_cache[node_id]
        }
        let row = $table.find(`tr[${ATTR_ID}="${node_id}"`).first() // expensive search
        if (row.length == 0) {
            throw `Node "${node_id}" not found`
        }
        node_cache[node_id] = row
        return row
    }

    function _get_row_from_node_or_row($table, arg) {
        let tr = null
        if (typeof arg === "string") {
            tr = _find_row($table, arg)
        } else {
            tr = arg
        }
        return tr
    }

    function _get_children($table, tr) {
        let parent_id = _get_node_id(tr)
        return $table.find(`tr[${ATTR_PARENT}="${parent_id}"]`)
    }

    function _get_parent($table, tr) {
        if (_is_root(tr)) {
            return null
        }

        let parent_id = tr.attr(ATTR_PARENT)
        if (typeof parent_id === "undefined") {
            return null
        }

        return _find_row($table, parent_id)
    }

    function _is_root(tr) {
        let attr = tr.attr(ATTR_ROOT)
        return typeof attr !== "undefined" && attr == "true"
    }

    function _is_children_loaded(tr) {
        let loaded = tr.attr(ATTR_CHILDREN_LOADED)
        if (loaded === "true" || loaded === true) {
            return true
        }
        return false
    }

    function _is_expanded($table, tr) {
        try {
            return (
                _get_tree_cell($table, tr).find(`.${CLASS_EXPANDER}`).hasClass(`${CLASS_EXPANDER_OPENED}`)
            )
        } catch (err) {
            return false
        }
    }

    function _get_children_count(tr) {
        try {
            let count = parseInt(tr.attr(ATTR_CHILDREN_COUNT))
            if (isNaN(count)) {
                count = 0
            }
            return count
        } catch (err) {
            return 0
        }
    }

    function _get_tree_cell($table, tr) {

        let tree_col_index = $table.data("options").col_index
        let first_cell = tr.find(`td:nth-child(${tree_col_index})`).first() // First cell, the one with the tree behavior
        if (first_cell.length == 0) {
            throw "No cell in row"
        }
        return first_cell
    }

    function _is_visible(tr) {
        return tr.is(":visible")
    }

    function _close_expander($table, tr) {
        _get_tree_cell($table, tr)
            .find(`.${CLASS_EXPANDER}`)
            .removeClass(`${CLASS_EXPANDER_OPENED}`)
            .addClass(`${CLASS_EXPANDER_CLOSED}`)
    }

    function _open_expander($table, tr) {
        _get_tree_cell($table, tr)
            .find(`.${CLASS_EXPANDER}`)
            .removeClass(`${CLASS_EXPANDER_CLOSED}`)
            .addClass(`${CLASS_EXPANDER_OPENED}`)
    }

    // Main modifier functions
    function _load_or_show_children($table, tr) {
        if (_is_children_loaded(tr)) {
            return _get_children($table, tr)
        }

        // Not loaded yet. Must load
        const node_id = _get_node_id(tr)
        let loaded_children = $table.data("options")["load_fn"](node_id, tr)
        if (typeof loaded_children === "undefined") {
            loaded_children = []
        }
        const children_output = []
        for (let i = 0; i < loaded_children.length; i++) {
            const child_node_id = loaded_children[i]["id"]
            const child_node_tr = loaded_children[i]["tr"]

            if (typeof child_node_id == "undefined") {
                throw "Missing key 'id' in load_fn under " + node_id
            }

            if (typeof child_node_tr == "undefined") {
                throw "Missing key 'tr' in load_fn under " + node_id
            }

            _add_node($table, node_id, child_node_id, child_node_tr)
            children_output.push(child_node_tr)
        }

        _increase_children_count($table, tr, children_output.length)
        tr.attr(ATTR_CHILDREN_LOADED, true)

        return $(children_output)
    }

    function _make_expandable($table, tr) {
        const tree_cell = _get_tree_cell($table, tr)
        if (tree_cell.find(`.${CLASS_EXPANDER}`).length == 0) {
            const expander = $table.data("expander_closed").clone()
            tree_cell.find(`.${CLASS_SPACER}`).first().append(expander)
            expander.click(function() {
                _toggle_row($table, tr)
            })
        }
    }

    function _make_non_expandable($table, tr) {
        const tree_cell = _get_tree_cell($table, tr)
        const expander = tree_cell.find(`.${CLASS_EXPANDER}`)
        if (expander.length > 0) {
            expander.remove()
        }
    }

    function _show_children_of_expanded_recursive($table, tr) {
        _get_children($table, tr).each(function() {
            const child = $(this)
            child.show()
            if (_is_expanded($table, child)) {
                _show_children_of_expanded_recursive($table, child)
            }
        })
    }

    function _expand_row($table, tr) {
        const children = _load_or_show_children($table, tr)
        if (children.length > 0) {
            // Iterate all immediate children
            children.each(function() {
                const child = $(this)
                child.show()
                _load_or_show_children($table, child)
                _show_children_of_expanded_recursive($table, tr) // If
            })

            _open_expander($table, tr)
            tr.trigger(EVENT_EXPANDED, {node_id : _get_node_id(tr)})
        } else {
            //throw 'Cannot expand row with no children'
        }
    }

    function _toggle_row($table, tr) {
        if (_is_expanded($table, tr)) {
            _collapse_row($table, tr)
        } else {
            _expand_row($table, tr)
        }
    }

    function _hide_children($table, tr) {
        _get_children($table, tr).each(function() {
            const child = $(this)
            child.hide()
            _hide_children($table, child)
        })
    }

    function _collapse_row($table, tr) {
        _hide_children($table, tr) // Just hide, no collapse to keep state of children
        _close_expander($table, tr)
        tr.trigger(EVENT_COLLAPSED, {node_id : _get_node_id(tr)})
    }

    function _expand_all($table) {
        $table.find(`tr[${ATTR_ROOT}]`).each(function() {
            _expand_descendent($table, $(this))
        })
    }

    function _expand_descendent($table, tr) {
        _expand_row($table, tr)
        _get_children($table, tr).each(function() {
            _expand_descendent($table, $(this))
        })
    }

    function _collapse_all($table, tr) {
        if (typeof tr == "undefined") {
            $table.find(`tr[${ATTR_ROOT}]`).each(function() {
                _collapse_all($table, $(this))
                if (_is_expanded($table, $(this))) {
                    _collapse_row($table, $(this))
                }
            })
        } else {
            _get_children($table, tr).each(function() {
                const child = $(this)
                _collapse_all($table, child) // Recursion before collapse to start by the end leaf
                if (_is_expanded($table, child)) {
                    _collapse_row($table, child)
                }
            })
        }
    }

    function _increase_children_count($table, tr, delta) {
        let actual_count = parseInt(tr.attr(ATTR_CHILDREN_COUNT))
        if (isNaN(actual_count)) {
            actual_count = 0
        }

        actual_count += delta
        tr.attr(ATTR_CHILDREN_COUNT, actual_count)

        if (actual_count < 0) {
            throw "negative number of children"
        } else if (actual_count == 0) {
            _make_non_expandable($table, tr)
        } else {
            _make_expandable($table, tr)
        }
    }

    function _add_node($table, parent_id, node_id, tr) {
        const first_cell = _get_tree_cell($table, tr)

        let actual_level = 0 // Start at 0 for root node
        _set_node_id(tr, node_id)
        if (parent_id === null) {
            // We are adding a root node
            tr.attr(ATTR_ROOT, true)
            $table.append(tr)
            tr.show()
        } else {
            // We are adding a subnode
            const parent = _find_row($table, parent_id) // Find the parent row
            if (parent.length == 0) {
                throw "No parent node with ID " + parent_id
            }
            actual_level = parseInt(parent.attr(ATTR_LEVEL)) + 1 // Level below the parent.
                // Since the table is flat, the insertion point is after the last element that share the same parent

            let previous_row = parent
            let actual_row = parent.next()
            while (_is_child_of(actual_row, parent_id)) {
                previous_row = actual_row
                actual_row = actual_row.next()
            }

            tr.insertAfter(previous_row)

            tr.attr(ATTR_PARENT, parent_id)
            tr.hide()
        }
        tr.attr(ATTR_LEVEL, actual_level)

        const options = $table.data("options")
        const expander_size = options.expander_size
        const spacer_width = options.indent * actual_level + expander_size + "px"
        first_cell.prepend(SPACER_TEMPLATE.clone().css("width", spacer_width))
    }

    function _delete_node($table, tr) {
        const children = _get_children($table, tr)
        children.each(function() {
            _delete_single_row($table, $(this))
        })

        _delete_single_row($table, tr)
    }

    function _delete_single_row($table, tr) {
        const node_cache = $table.data("node_cache")
        const node_id = _get_node_id(tr)
        const parent = _get_parent($table, tr)
        if (node_cache.hasOwnProperty(node_id)) {
            delete node_cache[node_id]
        }
        tr.remove()

        if (parent !== null) {
            _increase_children_count($table, parent, -1)
        }
    }

    function init($table, config) {
        let options = $.extend({}, DEFAULT_OPTIONS, config)
        $table.addClass(CLASS_TABLE)
        if (options.nowrap){
            $table.addClass(CLASS_NOWRAP)
        }

        let expander_size = options.expander_size
        if (typeof expander_size === "number") {
            expander_size = "" + expander_size + "px"
        } else {
            throw (
                "Unsupported data type for options 'expander_size' : " +
                typeof expander_size
            )
        }

        let expander_opened = EXPANDER_OPENED_TEMPLATE.clone()
        let expander_closed = EXPANDER_CLOSED_TEMPLATE.clone()
        let node_cache = {}

        expander_opened.css("width", expander_size).css('background-size', expander_size)
        expander_opened.css("height", expander_size).css('background-size', expander_size)
        expander_closed.css("width", expander_size).css('background-size', expander_size)
        expander_closed.css("height", expander_size).css('background-size', expander_size)
        
        $table.data("expander_closed", expander_closed)
        $table.data("expander_opened", expander_opened)
        $table.data("node_cache", node_cache)
        $table.data("options", options)
    }

    // public functions
    const public_funcs = {
        add_root_node: add_root_node,
        //'is_root': is_root,
        get_children: get_children,
        //'get_children_count': get_children_count,
        get_parent: get_parent,
        delete_node: delete_node,
        expand_node: expand_node,
        expand_all: expand_all,
        collapse_node: collapse_node,
        collapse_all: collapse_all,
    }

    $.fn.scrutiny_treetable = function(...args) {
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