(function($) {
    // Scrutiny Tree Table plugin. 
    // Custom made tree-table widget because all the one out there were either behind a paid license
    // or buggy and/or deprecated and/or not tailored to our need. 

    var ATTR_ID = "stt-id"
    var ATTR_PARENT = "stt-parent-id"
    var ATTR_LEVEL = "stt-level"
    var ATTR_CHILDREN_COUNT = "stt-children-count"
    var ATTR_CHILDREN_LOADED = "stt-children-loaded"
    var ATTR_ROOT = "stt-root"

    var DEFAULT_OPTIONS = {
        indent: 10,
        expander_size: 12,
        col_index: 1,
        load_fn: function() {
            throw "No loader defined"
        }
    }

    var SPACER_TEMPLATE = $("<span class='stt-spacer'></span>")

    $.fn.scrutiny_treetable = function(...args) {
        var val_out = this
        let each_out = $(this).each(function() {
            var $table = $(this).find('tbody')

            // public functions
            var public_funcs = {
                'add_root_node': add_root_node,
                //'is_root': is_root,
                'get_children': get_children,
                //'get_children_count': get_children_count,
                'get_parent': get_parent,
                'delete_node': delete_node,
                'expand_node': expand_node,
                'expand_all': expand_all,
                'collapse_node': collapse_node,
                'collapse_all': collapse_all
            }

            // Jquery plugin like approach.
            if (args.length < 1)
                throw 'Missing arguments'

            if (typeof(args[0]) === 'string') {
                let funcname = args[0]
                if (!public_funcs.hasOwnProperty(funcname)) {
                    throw 'Unknown function ' + funcname
                }
                let vout = public_funcs[funcname](...args.slice(1))
                if (typeof(vout) !== 'undefined') {
                    return vout
                }
            } else {
                init(...args)
            }

            function init(config) {

                let options = $.extend({}, DEFAULT_OPTIONS, config);
                let expander_size = options.expander_size
                if (typeof(expander_size) === 'number') {
                    expander_size = '' + expander_size + 'px'
                } else {
                    throw "Unsupported data type for options 'expander_size' : " + typeof(expander_size)
                }

                let expander_opened = $("<img width='16px' height='16px' class='stt-expander' src='expander-opened.png' />")
                let expander_closed = $("<img width='16px' height='16px' class='stt-expander' src='expander-closed.png' />")
                let node_cache = {}

                expander_opened.attr('width', expander_size)
                expander_opened.attr('height', expander_size)
                expander_closed.attr('width', expander_size)
                expander_closed.attr('height', expander_size)


                $table.data('expander_closed', expander_closed)
                $table.data('expander_opened', expander_opened)
                $table.data('node_cache', node_cache)
                $table.data('options', options)
            }

            /***  Public functions *** */
            function add_root_node(node_id, tr) {
                _add_node(null, node_id, tr)
                _load_or_show_children(tr)

                return $table
            }

            function get_children(arg) {
                let tr = _get_row_from_node_or_row(arg)
                return _get_children(tr)
            }

            function get_parent(arg) {
                let tr = _get_row_from_node_or_row(arg)
                _get_parent(tr)
            }

            function get_children_count(arg) {
                let tr = _get_row_from_node_or_row(arg)
                return _get_children_count(tr)
            }

            function delete_node(arg) {
                let tr = _get_row_from_node_or_row(arg)
                _delete_node(tr)

            }

            function expand_node(arg) {
                let tr = _get_row_from_node_or_row(arg)
                if (_is_visible(tr)) {
                    _expand_row(tr)
                }
            }

            function expand_all() {
                _expand_all()
            }

            function collapse_node(arg) {
                let tr = _get_row_from_node_or_row(arg)
                _collapse_row(tr)
            }

            function collapse_all(arg) {
                _collapse_all(arg)
            }

            function is_root(arg) {
                let tr = _get_row_from_node_or_row(arg)
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
                return typeof(tr.attr(ATTR_PARENT)) !== "undefined" && tr.attr(ATTR_PARENT) === parent_id
            }

            function _find_row(node_id) {
                let node_cache = $table.data('node_cache')
                if (node_cache.hasOwnProperty(node_id)) {
                    return node_cache[node_id]
                }
                let row = $table.find(`tr[${ATTR_ID}="${node_id}"`).first() // expensive search
                if (row.length == 0) {
                    throw 'Node "' + node_id + '" not found'
                }
                node_cache[node_id] = row
                return row
            }

            function _get_row_from_node_or_row(arg) {
                let tr = null
                if (typeof(arg) === 'string') {
                    tr = _find_row(arg)
                } else {
                    tr = arg
                }
                return tr
            }

            function _get_children(tr) {
                let parent_id = _get_node_id(tr)
                return $table.find(`tr[${ATTR_PARENT}="${parent_id}"]`)
            }

            function _get_parent(tr) {
                if (_is_root(tr)) {
                    return null
                }

                let parent_id = tr.attr(ATTR_PARENT)
                if (typeof(parent_id) === 'undefined') {
                    return null
                }

                return _find_row(parent_id)
            }

            function _is_root(tr) {
                let attr = tr.attr(ATTR_ROOT)
                return (typeof(attr) !== 'undefined' && attr == 'true')
            }

            function _is_children_loaded(tr) {
                let loaded = tr.attr(ATTR_CHILDREN_LOADED)
                if (loaded === "true" || loaded === true) {
                    return true
                }
                return false
            }

            function _is_expanded(tr) {
                try {
                    return (_get_tree_cell(tr).find(".stt-expander").attr('src') === $table.data('expander_opened').attr('src'))
                } catch {
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
                } catch {
                    return 0
                }
            }

            function _get_tree_cell(tr) {
                let tree_col_index = $table.data('options').col_index
                let first_cell = tr.find(`td:nth-child(${tree_col_index})`).first() // First cell, the one with the tree behavior
                if (first_cell.length == 0) {
                    throw 'No cell in row'
                }
                return first_cell
            }

            function _is_visible(tr) {
                tr.is(":visible")
            }

            function _close_expander(tr) {
                _get_tree_cell(tr).find(".stt-expander").attr('src', $table.data('expander_closed').attr('src'))
            }

            function _open_expander(tr) {
                _get_tree_cell(tr).find(".stt-expander").attr('src', $table.data('expander_opened').attr('src'))
            }


            // Main modifier functions
            function _load_or_show_children(tr) {
                if (_is_children_loaded(tr)) {
                    return _get_children(tr)
                }

                // Not loaded yet. Must load
                let node_id = _get_node_id(tr)
                let loaded_children = $table.data('options')['load_fn'](node_id, tr)
                if (typeof(loaded_children) === 'undefined') {
                    loaded_children = []
                }
                let children_output = []
                for (let i = 0; i < loaded_children.length; i++) {
                    let child_node_id = loaded_children[i]['id']
                    let child_node_tr = loaded_children[i]['tr']

                    if (typeof(child_node_id) == "undefined") {
                        throw "Missing key 'id' in load_fn under " + node_id
                    }

                    if (typeof(child_node_tr) == "undefined") {
                        throw "Missing key 'tr' in load_fn under " + node_id
                    }

                    _add_node(node_id, child_node_id, child_node_tr)
                    children_output.push(child_node_tr)
                }

                _increase_children_count(tr, children_output.length)
                tr.attr(ATTR_CHILDREN_LOADED, true)

                return $(children_output)
            }

            function _make_expandable(tr) {
                let first_cell = _get_tree_cell(tr)
                if (first_cell.find('.stt-expander').length == 0) {
                    let expander = $table.data('expander_closed').clone();
                    first_cell.find('.stt-spacer').first().append(expander)
                    expander.click(function() {
                        _toggle_row(tr)
                    })
                }
            }


            function _make_non_expandable(tr) {
                let first_cell = _get_tree_cell(tr)
                let expander = first_cell.find('.stt-expander')
                if (expander.length > 0) {
                    expander.remove()
                }
            }

            function _show_children_of_expanded_recursive(tr) {
                _get_children(tr).each(function() {
                    let child = $(this)
                    child.show()
                    if (_is_expanded(child)) {
                        _show_children_of_expanded_recursive(child)
                    }
                })
            }

            function _expand_row(tr) {

                let children = _load_or_show_children(tr)
                if (children.length > 0) {
                    // Iterate all immediate children
                    children.each(function() {
                        let child = $(this)
                        child.show()
                        _load_or_show_children(child)
                        _show_children_of_expanded_recursive(tr) // If 
                    })

                    _open_expander(tr)
                } else {
                    //throw 'Cannot expand row with no children'
                }
            }

            function _toggle_row(tr) {
                if (_is_expanded(tr)) {
                    _collapse_row(tr)
                } else {
                    _expand_row(tr)
                }
            }

            function _hide_children(tr) {
                _get_children(tr).each(function() {
                    let child = $(this)
                    child.hide()
                    _hide_children(child)
                })
            }

            function _collapse_row(tr) {
                _hide_children(tr) // Just hide, no collapse to keep state of children
                _close_expander(tr)
            }

            function _expand_all() {
                $table.find(`tr[${ATTR_ROOT}]`).each(function() {
                    _expand_descendent($(this))
                })
            }

            function _expand_descendent(tr) {
                _expand_row(tr)
                _get_children(tr).each(function() {
                    _expand_descendent($(this))
                })
            }

            function _collapse_all(tr) {
                if (typeof(tr) == 'undefined') {
                    $table.find(`tr[${ATTR_ROOT}]`).each(function() {
                        _collapse_all($(this))
                        if (_is_expanded($(this))) {
                            _collapse_row($(this))
                        }
                    })
                } else {
                    _get_children(tr).each(function() {
                        let child = $(this)
                        _collapse_all(child) // Recursion before collapse to start by the end leaf
                        if (_is_expanded(child)) {
                            _collapse_row(child)
                        }
                    })
                }
            }

            function _increase_children_count(tr, delta) {
                let actual_count = parseInt(tr.attr(ATTR_CHILDREN_COUNT))
                if (isNaN(actual_count)) {
                    actual_count = 0
                }

                actual_count += delta
                tr.attr(ATTR_CHILDREN_COUNT, actual_count)

                if (actual_count < 0) {
                    throw "negative number of children"
                } else if (actual_count == 0) {
                    _make_non_expandable(tr)
                } else {
                    _make_expandable(tr)
                }
            }


            function _add_node(parent_id, node_id, tr) {
                let first_cell = _get_tree_cell(tr)

                let actual_level = 0 // Start at 0 for root node
                _set_node_id(tr, node_id)
                if (parent_id === null) { // We are adding a root node
                    tr.attr(ATTR_ROOT, true)
                    $table.append(tr)
                    tr.show()
                } else { // We are adding a subnode
                    let parent = _find_row(parent_id) // Find the parent row
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

                let options = $table.data('options')
                let expander_size = options.expander_size
                let spacer_width = (options.indent * actual_level) + expander_size + "px"
                first_cell.prepend(SPACER_TEMPLATE.clone().css('width', spacer_width))

            }

            function _delete_node(tr) {
                let children = _get_children(tr)
                children.each(function() {
                    _delete_single_row($(this))
                })

                _delete_single_row(tr)
            }


            function _delete_single_row(tr) {
                let node_cache = $table.data('node_cache')
                let node_id = _get_node_id(tr)
                let parent = _get_parent(tr)
                if (node_cache.hasOwnProperty(node_id)) {
                    delete node_cache[node_id]
                }
                tr.remove()

                if (parent !== null) {
                    _increase_children_count(parent, -1)
                }
            }
        })

        return this // Jquery requirement
    }


})(jQuery);