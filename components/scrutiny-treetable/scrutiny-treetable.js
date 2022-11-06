
(function($) {
    // Scrutiny Tree Table plugin.
    // Custom made tree-table widget because all the one out there were either behind a paid license
    // or buggy and/or deprecated and/or not tailored to our need.

    const ATTR_ID = "stt-id"
    const ATTR_PARENT = "stt-parent-id"
    const ATTR_LEVEL = "stt-level"
    const ATTR_CHILDREN_COUNT = "stt-children-count"
    const ATTR_CHILDREN_LOADED = "stt-children-loaded"
    const ATTR_MOVING = 'stt-moving'

    const CLASS_TABLE = "stt-table"
    const CLASS_SPACER = "stt-spacer"
    const CLASS_EXPANDER = "stt-expander"
    const CLASS_EXPANDER_OPENED = "stt-expander-opened"
    const CLASS_EXPANDER_CLOSED = "stt-expander-closed"
    const CLASS_DRAGGER = 'stt-dragger'
    const CLASS_INSERT_BELOW = 'stt-insert-below'
    const CLASS_HIGHLIGTED = 'stt-highligted'
    const CLASS_JUST_DROPPED = 'stt-just-dropped'
    const CLASS_HEADER = 'stt-cell-header'
    const CLASS_DROP_IMPOSSIBLE = 'stt-drop-impossible'

    const DATAKEY_OPTIONS = 'stt-dk-options'
    const DATAKEY_NODE_CACHE = 'stt-dk-node-cache'
    const DATAKEY_EXPANDER_CLOSED = 'stt-dk-expander_closed'
    const DATAKEY_EXPANDER_OPENED = 'stt-dk-expander_opened'

    const EVENT_COLLAPSED = 'stt.collapsed'
    const EVENT_EXPANDED = 'stt.expanded'

    const INSERT_TYPE_BELOW = 0
    const INSERT_TYPE_INTO = 1
    const INSERT_TYPE_ABOVE = 2

    const DEFAULT_OPTIONS = {
        indent: 10,
        droppable: false,
        draggable: false,
        move_allowed: true,
        expander_size: 12,
        just_dropped_transition_length: 0.6,
        col_index: 1,
        load_fn: function() {
            throw "No loader defined"
        },
    }

    const SPACER_TEMPLATE = $(`<span class='${CLASS_SPACER}'></span>`)
    const EXPANDER_OPENED_TEMPLATE = $(`<div class='${CLASS_EXPANDER} ${CLASS_EXPANDER_OPENED}' />`)
    const EXPANDER_CLOSED_TEMPLATE = $(`<div class='${CLASS_EXPANDER} ${CLASS_EXPANDER_CLOSED}' />`)
    const DRAGGER_TEMPLATE = $(`<div class='${CLASS_DRAGGER}' />`)

    /***  Public functions *** */

    function add_root_node($table, node_id, tr) {
        _add_node($table, null, node_id, tr)
        _load_children($table, tr)
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

    function is_root($table, arg) {
        let tr = _get_row_from_node_or_row($table, arg)
        return _is_root(tr)
    }

    function move_node($table, arg, new_parent_id, after_node_id) {
        let options = _get_options($table)
        if (!options.move_allowed) {
            throw 'Moving node is not allowed'
        }

        if (typeof new_parent_id === 'undefined') {
            new_parent_id = null
        }

        if (typeof after_node_id === 'undefined') {
            after_node_id = null
        }

        let tr = _get_row_from_node_or_row($table, arg)

        _move_row($table, tr, new_parent_id, after_node_id)
    }

    function load_all($table) {
        _load_all($table)
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

    function _is_descendant($table, child_candidate_tr, parent_tr){
        let child_parent_tr = _get_parent($table, child_candidate_tr)
        while (child_parent_tr !== null){
            if (child_parent_tr.is(parent_tr)){
                return true;
            }
            child_parent_tr = _get_parent($table, child_parent_tr)
        }
        return false
    }

    function _find_row($table, node_id) {
        let node_cache = $table.data(DATAKEY_NODE_CACHE)
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
        return _get_nesting_level(tr) == 0
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
                _get_row_header_block($table, tr).find(`.${CLASS_EXPANDER}`).hasClass(`${CLASS_EXPANDER_OPENED}`)
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

        let tree_col_index = _get_options($table).col_index
        let tree_cell = tr.find(`td:nth-child(${tree_col_index})`).first() // First cell, the one with the tree behavior
        if (tree_cell.length == 0) {
            throw "No cell in row"
        }
        return tree_cell
    }

    function _get_row_header_block($table, tr){
        let tree_cell = _get_tree_cell($table, tr)
        let header_block = tree_cell.find(`.${CLASS_HEADER}`).first()
        if (header_block.length == 0){
            throw "No header block in row"
        }
        return header_block
    }

    function _is_visible(tr) {
        return tr.is(":visible")
    }

    function _get_nesting_level(tr) {
        return parseInt(tr.attr(ATTR_LEVEL))
    }

    function _close_expander($table, tr) {
        _get_row_header_block($table, tr)
            .find(`.${CLASS_EXPANDER}`)
            .removeClass(`${CLASS_EXPANDER_OPENED}`)
            .addClass(`${CLASS_EXPANDER_CLOSED}`)
    }

    function _open_expander($table, tr) {
        _get_row_header_block($table, tr)
            .find(`.${CLASS_EXPANDER}`)
            .removeClass(`${CLASS_EXPANDER_CLOSED}`)
            .addClass(`${CLASS_EXPANDER_OPENED}`)
    }

    function _get_options($table) {
        return $table.data(DATAKEY_OPTIONS)
    }

    // Main modifier functions
    function _load_children($table, tr) {
        if (_is_children_loaded(tr)) {
            return _get_children($table, tr)
        }
        const children_output = []

        // Not loaded yet. Must load
        const node_id = _get_node_id(tr)
        let loaded_children = _get_options($table)["load_fn"](node_id, tr)
        if (typeof loaded_children === "undefined") {
            loaded_children = []
        }

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

    function _load_descendant($table, tr) {
        _load_children($table, tr)
        _get_children($table, tr).each(function() {
            _load_descendant($table, $(this))
        })
    }

    function _get_root_nodes($table) {
        return $table.find(`tr[${ATTR_LEVEL}="0"]`)
    }

    function _load_all($table) {
        _get_root_nodes($table).each(function() {
            _load_descendant($table, $(this))
        })
    }

    function _make_expandable($table, tr) {
        const header_block = _get_row_header_block($table, tr)
        if (header_block.find(`.${CLASS_EXPANDER}`).length == 0) {
            const expander = $table.data(DATAKEY_EXPANDER_CLOSED).clone()
            header_block.find(`.${CLASS_SPACER}`).first().append(expander)
            expander.click(function() {
                _toggle_row($table, tr)
            })
        }
    }

    function _make_non_expandable($table, tr) {
        const header_block = _get_row_header_block($table, tr)
        const expander = header_block.find(`.${CLASS_EXPANDER}`)
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
        const children = _load_children($table, tr)
        if (children.length > 0) {
            // Iterate all immediate children
            children.each(function() {
                const child = $(this)
                child.show()
                _load_children($table, child)
                _show_children_of_expanded_recursive($table, tr) // If
            })

            _open_expander($table, tr)
            tr.trigger(EVENT_EXPANDED, {
                node_id: _get_node_id(tr)
            })
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
        tr.trigger(EVENT_COLLAPSED, {
            node_id: _get_node_id(tr)
        })
    }

    function _expand_all($table) {
        _get_root_nodes($table).each(function() {
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
            _get_root_nodes($table).each(function() {
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
        const tree_cell = _get_tree_cell($table, tr)

        let actual_level = 0 // Start at 0 for root node
        _set_node_id(tr, node_id)
        if (parent_id === null) {
            // We are adding a root node
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

        let header_block = $("<div/>").addClass(CLASS_HEADER)
        tree_cell.prepend(header_block)

        const options = _get_options($table)

        if (options.draggable) {
            let dragger = DRAGGER_TEMPLATE.clone()
            header_block.prepend(dragger)
            dragger.attr('draggable', true)
            dragger.on('dragstart', function(e) {
                e.originalEvent.dataTransfer.setData("node_id", _get_node_id(tr));
                e.originalEvent.dataTransfer.setDragImage(tr[0], 0, 0);

                if (options.droppable) {
                    if (_get_children($table, tr).length > 0){
                        _select_all_loaded_descendant($table, tr).addClass(CLASS_DROP_IMPOSSIBLE)
                    }
                }
            })

            dragger.on('dragend', function(e) {
                if (options.droppable) {
                    $table.find(`tr.${CLASS_DROP_IMPOSSIBLE}`).removeClass(CLASS_DROP_IMPOSSIBLE)
                }
                $table.find(`.${CLASS_HIGHLIGTED}`).removeClass(CLASS_HIGHLIGTED)
            })

        }

        if (options.droppable) {
            tr.on('dragover', function(e) {
                let dragged_row_id = e.originalEvent.dataTransfer.getData('node_id')
                let dragged_tr = _find_row($table, dragged_row_id)
                let result = _get_dragndrop_result($table, dragged_tr, tr, e.pageY)
                if (result != null){

                    $('#new_parent_id').text(result.new_parent_id)
                    $('#insert_after_id').text(result.after_tr_id)
                    $('#insert_type').text(result.insert_type)
                }
                else{
                    $('#new_parent_id').text("N/A")
                    $('#insert_after_id').text("N/A")
                    $('#insert_type').text("N/A")
                }

                $table.find(`tr.${CLASS_INSERT_BELOW}`).removeClass(CLASS_INSERT_BELOW)

                if (result == null){
                    $table.find('tr').removeClass(CLASS_HIGHLIGTED)
                    return
                }
                
                if (result.new_parent_id != null){
                    $table.find(`tr.${CLASS_HIGHLIGTED}`).removeClass(CLASS_HIGHLIGTED)
                    let new_parent_tr = _find_row($table, result.new_parent_id)
                    let descendant = _select_all_loaded_descendant($table, new_parent_tr)
                    descendant.addClass(CLASS_HIGHLIGTED)
                }

                if (result.insert_line_display.row_id != null){
                    let insert_line_tr = _find_row($table, result.insert_line_display.row_id)
                    if (result.insert_line_display.insert_type == INSERT_TYPE_ABOVE){
                        insert_line_tr.prevAll('tr:visible').first().addClass(CLASS_INSERT_BELOW)
                    } else if (result.insert_line_display.insert_type == INSERT_TYPE_BELOW){
                        insert_line_tr.addClass(CLASS_INSERT_BELOW)
                    } else{
                        _remove_all_insert_lines($table)
                    }
                }

                e.preventDefault() // Required for drop to work?
            })

            tr.on('drop', function(e) {
                if (options.droppable) {
                        let dragged_row_id = e.originalEvent.dataTransfer.getData('node_id')
                        let dragged_tr = _find_row($table, dragged_row_id)
                        let result = _get_dragndrop_result($table, dragged_tr, tr, e.pageY)

                        let moved_rows = _move_row($table, dragged_tr, result.new_parent_id, result.after_tr_id)
                        moved_rows.addClass(CLASS_JUST_DROPPED)
                        
                        setTimeout(function() {
                            moved_rows.css('transition', `background-color ${options.just_dropped_transition_length}s`)
                            setTimeout(function() {
                                moved_rows.removeClass(CLASS_JUST_DROPPED)
                                setTimeout(function() {
                                    moved_rows.css('transition', '')
                                }, options.just_dropped_transition_length * 1000)
                            }, 0)
                        }, 0)

                        _stop_drop($table)
                    }
                })

            tr.on('dragexit', function() {
                _stop_drop($table)
            })
        }


        header_block.prepend(SPACER_TEMPLATE.clone())
        _set_nesting_level($table, tr, actual_level)

    }

    function _stop_drop($table){
        $table.find(`tr.${CLASS_INSERT_BELOW}`).removeClass(CLASS_INSERT_BELOW)
        $table.find(`tr.${CLASS_HIGHLIGTED}`).removeClass(`${CLASS_HIGHLIGTED}`)
    }

    function _get_dragndrop_result($table, dragged_tr, hover_tr, cursorY) {
        /*
            Returns the correct move action according to where we hover the drag n drop.
            Expects hover_tr to have its children loaded.
        */
            $("#code_branch").text('')
        if (hover_tr.is(dragged_tr) || _is_descendant($table, hover_tr, dragged_tr)){
            return null
        }

        if (hover_tr == null) {
            return null
        }
        if (hover_tr.length == 0) {
            return null
        }

        let result = {
            'new_parent_id': null,
            'after_tr_id': null,
            'insert_type': null,
            'insert_line_display' : {
                'row_id' : null,
                'insert_type' : null
            }
        }

        
        let hover_tr_id = (hover_tr == null) ? null : _get_node_id(hover_tr)
        let hover_prev_tr = hover_tr.prevAll('tr:visible').first()
        let hover_prev_tr_id = (hover_prev_tr.length == 0) ? null : _get_node_id(hover_prev_tr)
        let hover_next_tr = hover_tr.nextAll('tr:visible').first()
        let hover_next_tr_id = (hover_next_tr.length == 0) ? null : _get_node_id(hover_next_tr)

        let insert_type = _get_row_insert_type(hover_tr, cursorY)
        result.insert_line_display.insert_type = insert_type
        
        if (insert_type == INSERT_TYPE_INTO) {
            $("#code_branch").text('Branch A')
            let last_child = _get_children($table, hover_tr).last();
            result.new_parent_id = hover_tr_id
            result.after_tr_id = (last_child.length == 0) ? null : _get_node_id(last_child);
            result.insert_type = 'into'
            result.insert_line_display.row_id = null
        } else if (insert_type == INSERT_TYPE_BELOW){
            result.insert_type = 'below'
            result.insert_line_display.row_id = hover_tr_id    // Display the insert line after the hover line
            if (hover_next_tr_id == null){
                // Last line of table
                $("#code_branch").text('Branch B')
                let last_root_node = _get_root_nodes($table).last()
                result.new_parent_id = null        // Make a root node
                result.after_tr_id =  (last_root_node.length == 0) ? null : _get_node_id(last_root_node)  // Right after the hoverring row

            } else {
                $("#code_branch").text('Branch C')
                let next_tr_parent = _get_parent($table, hover_next_tr)
                let next_tr_prev_same_level = _get_prev_same_level(hover_next_tr)
                result.new_parent_id = (next_tr_parent == null) ? null : _get_node_id(next_tr_parent)
                result.after_tr_id = (next_tr_prev_same_level == null) ? null : _get_node_id(next_tr_prev_same_level)
            }
        }

        else if (insert_type == INSERT_TYPE_ABOVE){
            result.insert_line_display.row_id = hover_tr_id
            result.insert_type = 'above'
            if (hover_prev_tr_id == null){
                $("#code_branch").text('Branch D')
                result.new_parent_id = null    // Make a root node
                result.after_tr_id = null      // First root node
            } else{
                $("#code_branch").text('Branch E')
                let hover_tr_parent = _get_parent($table, hover_tr)
                let hover_tr_prev_same_level = _get_prev_same_level(hover_tr)
                result.new_parent_id = (hover_tr_parent == null) ? null : _get_node_id(hover_tr_parent)
                result.after_tr_id = (hover_tr_prev_same_level == null) ? null : _get_node_id(hover_tr_prev_same_level)
            }
        }

        return result
    }

    function _get_next_same_level(tr){
        let target_nesting = _get_nesting_level(tr)
        let actual_tr = tr
        let next_tr = tr.next()
        while (next_tr.length != 0){
            let next_tr_nesting_level = _get_nesting_level(next_tr)
            if (next_tr_nesting_level == target_nesting){
                return next_tr
            }

            if (next_tr_nesting_level < target_nesting){
                return null
            }
            
            let temp = actual_tr.next()
            actual_tr = next_tr
            next_tr = temp
        }
        
        return null
    }

    function _get_prev_same_level(tr){
        let target_nesting = _get_nesting_level(tr)
        let actual_tr = tr
        let prev_tr = tr.prev()
        while (prev_tr.length != 0){
            let prev_tr_nesting_level = _get_nesting_level(prev_tr)
            if (prev_tr_nesting_level == target_nesting){
                return prev_tr
            }

            if (prev_tr_nesting_level < target_nesting){
                return null
            }
            
            let temp = actual_tr.prev()
            actual_tr = prev_tr
            prev_tr = temp
        }
        
        return null
    }



    function _set_nesting_level($table, tr, level) {
        let options = _get_options($table)
        const expander_size = options.expander_size
        const spacer_width = options.indent * level + expander_size + "px"
        tr.attr(ATTR_LEVEL, level)
        let header_block = _get_row_header_block($table, tr)
        let spacer = header_block.find(`.${CLASS_SPACER}`)
        spacer.css('width', spacer_width)

    }

    function _get_row_insert_type(tr, cursorY) {
        let relativeY = cursorY - tr.offset().top
        let fraction_height = 1 / 4 * tr.outerHeight()
        if (relativeY < 1*fraction_height) {
            return INSERT_TYPE_ABOVE
        } else if (relativeY > 3 * fraction_height) {
            return INSERT_TYPE_BELOW
        } else {
            return INSERT_TYPE_INTO
        }
    }

    function _delete_node($table, tr) {
        const children = _get_children($table, tr)
        children.each(function() {
            _delete_single_row($table, $(this))
        })

        _delete_single_row($table, tr)
    }

    function _delete_single_row($table, tr) {
        const node_cache = $table.data(DATAKEY_NODE_CACHE)
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

    function _load_all($table) {
        _expand_all($table) // Will force each row to be loaded.
        _collapse_all($table)
    }

    function _move_row($table, tr, new_parent_id, after_node_id) {
        let tr_id = _get_node_id(tr)
        console.log(`Moving ${tr_id}. Parent=${new_parent_id}. After=${after_node_id}`)
        let tree_to_move = _select_all_loaded_descendant($table, tr)
        let tr_original_parent = _get_parent($table, tr)
        let new_nesting_level = null
        if (new_parent_id == null) {
            new_nesting_level = 0
            if (after_node_id == null) {
                $table.find('tbody').prepend(tree_to_move)
            } else {
                let after_tr = _find_row($table, after_node_id)
                if (!_is_root(after_tr)) {
                    throw `Cannot insert a root node after node ${after_node_id} because it is not a root node itself`
                }

                if (tr_id != after_node_id) {
                    tree_to_move.attr(ATTR_MOVING, "1")
                    let after_tr_last_descendant = _select_all_loaded_descendant($table, after_tr, `tr[${ATTR_MOVING}!="1"]`).last()
                    tree_to_move.attr(ATTR_MOVING, "")
                    if (!after_tr_last_descendant.is(tree_to_move.first())){    // Already at the right place.
                        after_tr_last_descendant.after(tree_to_move)
                    }
                }
            }

            tr.attr(ATTR_PARENT, null)
        } else {
            let new_parent_row = _find_row($table, new_parent_id)

            tree_to_move.each(function() {
                if ($(this).is(new_parent_row)) {
                    throw 'Cannot move a tree within itself'
                }
            })

            new_nesting_level = _get_nesting_level(new_parent_row) + 1
            _load_children($table, new_parent_row)

            if (after_node_id == null) {
                new_parent_row.after(tree_to_move)
            } else {
                let after_tr = _find_row($table, after_node_id)
                let after_parent_row = _get_parent($table, after_tr)

                if (after_parent_row == null || !after_parent_row.is(new_parent_row)) {
                    throw 'Given "after_row" is not a child of given "parent_row"'
                }

                if (tr_id != after_node_id) {
                    tree_to_move.attr(ATTR_MOVING, "1")
                    let after_tr_last_descendant = _select_all_loaded_descendant($table, after_tr, `tr[${ATTR_MOVING}!="1"]`).last()
                    tree_to_move.attr(ATTR_MOVING, "")
                    if (!after_tr_last_descendant.is(tree_to_move.first())){    // Already at the right place.
                        after_tr_last_descendant.after(tree_to_move)
                    }
                }
            }
            tr.attr(ATTR_PARENT, new_parent_id)
            _increase_children_count($table, new_parent_row, 1);
            _expand_row($table, new_parent_row)
        }

        if (tr_original_parent != null) {
            _increase_children_count($table, tr_original_parent, -1)
        }

        let previous_nesting_level = _get_nesting_level(tr)
        let delta_nesting_level = (new_nesting_level - previous_nesting_level)
        tree_to_move.each(function() {
            _set_nesting_level($table, $(this), _get_nesting_level($(this)) + delta_nesting_level)
        })

        return tree_to_move
    }

    function _select_all_loaded_descendant($table, tr, filter, arr) {
        let return_val = false
        if (typeof arr === 'undefined') {
            arr = []
            return_val = true
        }

        if (typeof filter === 'undefined') {
            filter=null
        }
        
        if (filter !=null){
            tr = tr.filter(filter)
        }
        if (tr.length > 0){
            arr.push(tr[0])
            let children = _get_children($table, tr)
            if (filter !=null){
                children.filter(filter) 
            }
            children.each(function() {
                _select_all_loaded_descendant($table, $(this), filter, arr)
            })
        }
        if (return_val) {
            return $(arr)
        }
    }

    function _load_and_select_all_descendant($table, tr, arr) {
        let return_val = false
        if (typeof arr === 'undefined') {
            arr = []
            return_val = true
        }
        arr.push(tr[0])
        _load_children($table, tr)
        let children = _get_children($table, tr)
        children.each(function() {
            _load_and_select_all_descendant($table, $(this), arr)
        })

        if (return_val) {
            return $(arr)
        }
    }

    function init($table, config) {
        let options = $.extend({}, DEFAULT_OPTIONS, config)
        $table.addClass(CLASS_TABLE)

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

        $table.data(DATAKEY_EXPANDER_CLOSED, expander_closed)
        $table.data(DATAKEY_EXPANDER_OPENED, expander_opened)
        $table.data(DATAKEY_NODE_CACHE, node_cache)
        $table.data(DATAKEY_OPTIONS, options)

    }

    // public functions
    const public_funcs = {
        'add_root_node': add_root_node,
        'is_root': is_root,
        'get_children': get_children,
        'get_children_count': get_children_count,
        'get_parent': get_parent,
        'delete_node': delete_node,
        'expand_node': expand_node,
        'expand_all': expand_all,
        'collapse_node': collapse_node,
        'collapse_all': collapse_all,
        'move_node': move_node,
        'load_all': load_all
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