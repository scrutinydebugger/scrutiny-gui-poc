//    scrutiny-treetable.ts
//        A JQuery plugin that allows making a table act as a tree.
//        Custom made tree-table widget because all the one out there were either behind a
//        paid license or buggy and/or deprecated and/or not tailored to our need.
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { default as $ } from "@jquery"

export interface LoadFunctionInterface {
    (node_id: string, tr: JQueryRow, user_data?: any): Array<{ id?: string; tr: JQueryRow; no_children?: boolean; user_data?: any }>
}

export interface TransferFunctionMetadata {
    original_id: string
    original_parent_id: string | null
    user_data: any
}

export interface TransferFunctionOutput {
    tr: JQueryRow
    id?: string | null
}

export interface TransferFunctionInterface {
    (source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata): TransferFunctionOutput
}

export enum TransferScope {
    NONE = "none",
    ROW_ONLY = "row",
    VISIBLE_ONLY = "visible",
    ALL = "all",
}

export interface TransferPolicy {
    scope: TransferScope
}

export interface TransferPolicyFunctionInterface {
    (
        source_table: JQueryTable,
        dest_table: JQueryTable,
        tr: JQuery,
        new_parent_id: string | null,
        after_node_id: string | null
    ): TransferPolicy
}

export interface TransferResult {
    source_rows: JQueryRow
    dest_rows: JQueryRow
    id_map: Record<string, string>
}
export interface DragData {
    source_table_id: string
    dragged_row_id: string
}

export function get_drag_data_from_drop_event(e: JQuery.DropEvent<HTMLElement, undefined, HTMLElement, HTMLElement>): DragData | null {
    if (typeof e.originalEvent === "undefined") {
        return null
    }

    if (e.originalEvent.dataTransfer === null) {
        return null
    }
    const drag_data_str = e.originalEvent.dataTransfer.getData("scrutiny_tree_table.drag_data")
    if (typeof drag_data_str === "undefined") {
        return null
    }

    try {
        const drag_data = JSON.parse(drag_data_str) as DragData

        if (typeof drag_data.source_table_id === "undefined") {
            return null
        }

        if (typeof drag_data.dragged_row_id === "undefined") {
            return null
        }

        return drag_data
    } catch {
        return null
    }
}

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
type JQueryCell = JQuery<HTMLTableCellElement>

interface JQueryResizableTable extends JQueryTable {
    scrutiny_resizable_table?: any
}

var gbl_drag_data: DragData | null = null

export const ATTR_ID = "stt-id" // The row ID
export const ATTR_PARENT = "stt-parent-id" // The parent row ID
export const ATTR_LEVEL = "stt-level" // Nesting level. Integer (0,1,2,3). Bigger is deeper
export const ATTR_CHILDREN_COUNT = "stt-children-count" // Number of children for a row
export const ATTR_CHILDREN_LOADED = "stt-children-loaded" // Boolean indicating if the children of this node has been loaded
export const ATTR_MOVING = "stt-moving" // Temporary boolean to handle edge case when moving rows

/**  Applied on the table */
const CLASS_TABLE = "stt-table"
/**  Applied on each row */
const CLASS_ROW = "stt-row"
/**  Applied on the spaced that create the nesting effect */
const CLASS_SPACER = "stt-spacer"
/**  Applied on the div element that serves as an expand button */
const CLASS_EXPANDER = "stt-expander"
/**  Applied on the expander when it must how an expanded state */
const CLASS_EXPANDER_OPENED = "stt-expander-opened"
/**  Applied on the expander when it must how an collapsed state */
const CLASS_EXPANDER_CLOSED = "stt-expander-closed"
/**  Applied on the dra-n-drop handle */
const CLASS_DRAGGER = "stt-dragger"
/**  Applied on a row when we want to drag-n-dop just below it */
const CLASS_INSERT_BELOW = "stt-insert-below"
/**  Applied on a row when we want to drag-n-dop just above it */
const CLASS_INSERT_ABOVE = "stt-insert-above"
/**  Applied on a row that must be highlighted */
const CLASS_HIGHLIGHTED = "stt-highlighted"
/**  Applied for a short amount of time on a row that just has been dropped after a drag-n-dop */
const CLASS_JUST_DROPPED = "stt-just-dropped"
/**  Applied on the div that contains all plugin elements in the row (expander, spacer) */
const CLASS_HEADER = "stt-cell-header"
/**  Applied on a row that must appear as disabled. Used when dragging an element. */
const CLASS_DISABLED = "stt-disabled"
/**  Applied on a row that does not accept children */
const CLASS_NO_CHILDREN = "stt-no-children"
/**  Applied on the cell that contains the tree element */
const CLASS_TREE_CELL = "stt-tree-cell"
/** Applied on rows that are loaded but hidden */
const CLASS_HIDDEN = "stt-hidden"

/**  To store the plugin options */
const DATAKEY_OPTIONS = "stt-dk-options"
/**  To store a dict of already loaded nodes */
const DATAKEY_NODE_CACHE = "stt-dk-node-cache"
/**  Stores the expander template (can be configured through options) */
const DATAKEY_EXPANDER_CLOSED = "stt-dk-expander_closed"
/**  Stores the expander template (can be configured through options) */
const DATAKEY_EXPANDER_OPENED = "stt-dk-expander_opened"
/**  User data associated with a row */
const DATAKEY_USER_DATA = "stt-dk-userdata"

/**  Triggered when a row is collapsed */
const EVENT_COLLAPSED = "stt.collapsed"
/**  Triggered when a row is expanded */
const EVENT_EXPANDED = "stt.expanded"
/**  Triggered when a row is dropped after a drag-n-drop */
const EVENT_DROPPED = "stt.dropped"
const EVENT_SIZE_CHANGED = "stt.size-changed"

// Enum-ish for drag-n-drop
const INSERT_TYPE_BELOW = 0
const INSERT_TYPE_INTO = 1
const INSERT_TYPE_ABOVE = 2

const DEFAULT_OPTIONS = {
    /**  Indentation caused by each nesting */
    indent: 10,
    /**  Indicate that we can drop rows on this table */
    droppable: false,
    /**  Indicate that we can drag rows from this table */
    draggable: false,
    /**  Allow rows to be moved within a table */
    move_allowed: true,
    /**  The size in pixel of the expander. */
    expander_size: 12,
    /**  When a row is dropped, length of the temporary highlight */
    just_dropped_transition_length: 0.6,
    /**  The index (left to right) of the cell that will contain the tree header */
    col_index: 1,
    /**  Makes the table resizable using the scrutiny_resizable_table plugin */
    resizable: false,
    /**  Options passed to the scrutiny_resizable_table plugin */
    resize_options: {},
    /** Loading function to dynamically load the table */
    load_fn: function () {
        throw "No loader defined"
    } as LoadFunctionInterface,
    /** A function called to convert a row when a row is moved from one table to another table. */
    transfer_fn: null as TransferFunctionInterface | null,
    /** A function used to know wether a row is transferable to another table or not.  */
    transfer_policy_fn: null as TransferPolicyFunctionInterface | null,
}

type PluginOptionsFull = typeof DEFAULT_OPTIONS
export type PluginOptions = Partial<PluginOptionsFull> // The user doesn't have to specify them all

const SPACER_TEMPLATE = $(`<span class='${CLASS_SPACER}'></span>`)
const EXPANDER_OPENED_TEMPLATE = $(`<div class='${CLASS_EXPANDER} ${CLASS_EXPANDER_OPENED}' />`)
const EXPANDER_CLOSED_TEMPLATE = $(`<div class='${CLASS_EXPANDER} ${CLASS_EXPANDER_CLOSED}' />`)
const DRAGGER_TEMPLATE = $(`<div class='${CLASS_DRAGGER}' />`)

/***  Public functions *** */

/**
 * Adds a row as a root node.
 * @param $table The JQuery table
 * @param node_id Node ID to assign to the row
 * @param tr The row to add
 */
function add_root_node($table: JQueryTable, node_id: string, tr: JQueryRow): void {
    add_node($table, node_id, tr, null)
}

/**
 * Adds a row as a node.
 * @param $table The JQuery table
 * @param node_id Node ID to assign to the row
 * @param tr The row to add
 * @param new_parent_id The node id of the parent. Set to null to make a root node
 */
function add_node($table: JQueryTable, node_id: string, tr: JQueryRow, new_parent_id: string | null): void {
    if (typeof node_id !== "string") {
        throw "node_id is not a string"
    }

    if (typeof new_parent_id !== "string" && new_parent_id !== null) {
        throw "new_parent_id is not a string or null"
    }

    _add_node($table, new_parent_id, node_id, tr)
    _load_children($table, tr)
}

/**
 * Returns the root nodes that contains the given node
 * @param $table The JQuery table
 * @param node The given node
 * @returns The root node containing the given node
 */
function get_root_node_of($table: JQueryTable, node: string | JQueryRow) {
    const row = _get_row_from_node_or_row($table, node)
    return _get_root_node_of($table, row)
}

/**
 * Returns the immediate children of the given row
 * @param $table The JQuery table
 * @param node The row from which to fetch the children
 * @returns The row children
 */
function get_children($table: JQueryTable, node: string | JQueryRow): JQueryRow {
    const tr = _get_row_from_node_or_row($table, node)
    return _get_children($table, tr)
}

/**
 * Returns the parent of a node
 * @param $table The JQuery table
 * @param node The child node
 * @returns The parent if node
 */
function get_parent($table: JQueryTable, node: string | JQueryRow): JQueryRow | null {
    let tr = _get_row_from_node_or_row($table, node)
    return _get_parent($table, tr)
}

/**
 * Returns the immediate children of the given parent node
 * @param $table The JQuery table
 * @param node The parent node
 * @returns The immediate children nodes
 */
function get_children_count($table: JQueryTable, node: string | JQueryRow): number {
    let tr = _get_row_from_node_or_row($table, node)
    return _get_children_count(tr)
}

/**
 * Deletes a row and all its descendants from the table
 * @param $table The JQuery table
 * @param node The row to delete
 */
function delete_node($table: JQueryTable, node: string | JQueryRow): void {
    let tr = _get_row_from_node_or_row($table, node)
    _delete_node($table, tr)
}

/**
 * Expands a row so that the immediate children are displayed
 * @param $table The JQuery table
 * @param node The row to expand
 */
function expand_node($table: JQueryTable, node: string | JQueryRow): void {
    let tr = _get_row_from_node_or_row($table, node)
    if (_is_visible(tr)) {
        _expand_row($table, tr)
    }
}

/**
 * Expands every row in the table
 * @param $table The JQuery table
 */
function expand_all($table: JQueryTable): void {
    _expand_all($table)
}

/**
 * Collapses a row so that all the descendants are hidden. Does not collapse children that have children themselves
 * @param $table The JQuery table
 * @param node The row to expand
 */
function collapse_node($table: JQueryTable, node: string | JQueryRow): void {
    let tr = _get_row_from_node_or_row($table, node)
    _collapse_row($table, tr)
}

/**
 * Collapses every row under the given row or in the whole table if no row is given.
 * Children of children will be collapsed as well.
 * @param $table The JQuery table
 * @param node The row collapsing cascade start point. All rows collapsed if not provided
 */
function collapse_all($table: JQueryTable, node?: string | JQueryRow): void {
    if (typeof node !== "undefined") {
        node = _get_row_from_node_or_row($table, node)
    }
    _collapse_all($table, node) // node can be undefined here. Will collapse all rows.
}

/**
 * Returns a boolean indicating if the node is a root node
 * @param $table The JQuery table
 * @param node The node to get the status
 * @returns true if the node is a root node
 */
function is_root($table: JQueryTable, node: string | JQueryRow): boolean {
    let tr = _get_row_from_node_or_row($table, node)
    return _is_root(tr)
}

/**
 * Fetch the list of root nodes in the table
 * @param $table The JQuery table
 * @returns List of root nodes
 */
function get_root_nodes($table: JQueryTable): JQueryRow {
    return _get_root_nodes($table)
}

/**
 * Moves a row within the same table under an optional parent row and after an optional reference row
 *
 * @param $table Jquery table object
 * @param row_id The ID of the row in the source table to transfer
 * @param new_parent_id The ID of the new parent row in the table. If not set or null, the row
 * will become a root node
 * @param after_node_id The row after which the moved row will be inserted. If not set or null,
 * the moved row will be set in last position
 */
function move_node($table: JQueryTable, row_id: string, new_parent_id?: string | null, after_node_id?: string | null) {
    let options = _get_options($table)
    if (!options.move_allowed) {
        throw "Moving node is not allowed"
    }

    if (typeof new_parent_id === "undefined") {
        new_parent_id = null
    }

    if (typeof after_node_id === "undefined") {
        after_node_id = null
    }

    const tr = _get_row_from_node_or_row($table, row_id)

    _move_row($table, tr, new_parent_id, after_node_id)
}

/**
 * Moves a row from the table to the given destination table under an optional parent row
 * and after an optional reference row.
 *
 * @param $table Source table
 * @param dest_table Destination table
 * @param row_id The ID of the row in the source table to transfer
 * @param new_parent_id The ID of the new parent row in the destination table. If not set or null, the row
 * will become a root node in the destination table
 * @param after_node_id The row after which the transferred row will be inserted. If not set or null,
 * the transferred row will be set in last position
 * @return A dictionanary that maps the old node ID to the new node ID
 */
function transfer_node_to(
    src_table: JQueryTable,
    dest_table: JQueryTable | string,
    dragged_row_id: string,
    new_parent_id: string | null,
    after_node_id: string | null
): TransferResult | null {
    return _public_transfer_row(src_table, dest_table, dragged_row_id, new_parent_id, after_node_id)
}

function transfer_node_from(
    dest_table: JQueryTable,
    src_table: JQueryTable | string,
    dragged_row_id: string,
    new_parent_id: string | null,
    after_node_id: string | null
): TransferResult | null {
    return _public_transfer_row(src_table, dest_table, dragged_row_id, new_parent_id, after_node_id)
}

function _public_transfer_row(
    src_table: JQueryTable | string,
    dest_table: JQueryTable | string,
    dragged_row_id: string,
    new_parent_id: string | null,
    after_node_id: string | null
): TransferResult | null {
    if (typeof src_table == "string") {
        src_table = $(`#${src_table}`) as JQueryTable
    }

    if (typeof dest_table == "string") {
        dest_table = $(`#${dest_table}`) as JQueryTable
    }

    if (dest_table.length != 1) {
        // Can only be done on a single table
        return null
    }

    if (typeof new_parent_id === "undefined") {
        new_parent_id = null
    }

    if (typeof after_node_id === "undefined") {
        after_node_id = null
    }
    const tr = _get_row_from_node_or_row(src_table, dragged_row_id)

    const dest_options = _get_options(dest_table)
    if (dest_options.transfer_policy_fn == null) {
        // User didn't define an transfer_policy_fn func. We can't do anything
        return null
    }
    const transfer_policy = dest_options.transfer_policy_fn(src_table, dest_table, tr, new_parent_id, after_node_id)
    if (typeof transfer_policy == "undefined" || transfer_policy.scope == TransferScope.NONE) {
        return null // User disallowed the transfer
    }

    let transfer_result = _transfer_row(src_table, dest_table, tr, new_parent_id, after_node_id)
    if (transfer_result === null) {
        return null
    }
    return transfer_result
}

/**
 * Load the whole table by querying the user load_fn
 * @param $table The Jquery table
 */
function load_all($table: JQueryTable): void {
    _load_all($table)
}

/**
 * Returns the list of visible rows in the table
 * @param $table The Jquery table
 * @param parent An optional parent to limit the search scope
 * @param filter An optional filter to apply on the row set
 * @returns The list of visible rows that matches the given filter or all if no filter is given
 */
function get_visible_nodes($table: JQueryTable, parent?: JQueryRow | string | null, filter?: string): JQueryRow {
    if (typeof parent === "undefined") {
        parent = null
    }

    if (parent !== null) {
        parent = _get_row_from_node_or_row($table, parent)
    }

    return _get_visible_rows($table, parent, filter)
}

function get_nodes($table: JQueryTable, node_id: string[] | string): JQueryRow {
    if (typeof node_id == "string") {
        return _find_row($table, node_id)
    }

    let output = []

    for (let i = 0; i < node_id.length; i++) {
        output.push(_find_row($table, node_id[i]))
    }

    return $(output)
}

function get_node_nesting_level($table: JQueryTable, node: string | JQueryRow): number {
    const tr = _get_row_from_node_or_row($table, node)
    return _get_nesting_level(tr)
}

/***  Private functions *** */

/**
 * Generate a unique ID string for this table.
 * @param $table The Jquery table
 * @returns Unique ID
 */
const _make_unique_id = (function () {
    let _counter = 0
    return function _make_unique_id($table: JQuery): string {
        const counter = _counter++
        const table_id = $table.attr("id")
        return `stt_uid_${table_id}_${counter}`
    }
})()

// Basic accessors

/**
 * Get the treetable ID (not the HTML ID)
 * @param tr Node row object
 * @returns Node ID
 */
function _get_node_id(tr: JQueryRow): string {
    const id = tr.attr(ATTR_ID)
    if (typeof id == "undefined") {
        throw "No ID on row"
    }
    return id
}

/**
 * Set the treetable ID (not HTML ID) on a row
 * @param tr Node row object
 * @param node_id The ID to set on the node
 * @returns The same row object received as input
 */
function _set_node_id(tr: JQueryRow, node_id: string): JQueryRow {
    return tr.attr(ATTR_ID, node_id)
}

/**
 * Tells if a row is the child of another specific row
 * @param tr Node row object
 * @param parent_id The ID of the parent
 * @returns True if the row is child of the row with the given parent ID
 */
function _is_child_of(tr: JQueryRow, parent_id: string) {
    return typeof tr.attr(ATTR_PARENT) !== "undefined" && tr.attr(ATTR_PARENT) === parent_id
}

/**
 * Tells if the given row is a descendant (non-immediate child) of the given parent row
 * @param $table
 * @param child_candidate_tr The row that is tested to be a descendant of another
 * @param parent_tr The parent row used for the test
 * @returns True if the row is a descendant of the parent
 */
function _is_descendant($table: JQueryTable, child_candidate_tr: JQueryRow, parent_tr: JQueryRow): boolean {
    let child_parent_tr = _get_parent($table, child_candidate_tr)
    while (child_parent_tr !== null) {
        if (child_parent_tr.is(parent_tr)) {
            return true
        }
        child_parent_tr = _get_parent($table, child_parent_tr)
    }
    return false
}

/**
 * Returns the JQuery row object of the node with the given textual ID
 * @param $table The JQuery table
 * @param node_id The node ID (not HTML ID)
 * @returns The JQuery object referencing the row
 */
function _find_row($table: JQueryTable, node_id: string): JQueryRow {
    let node_cache = $table.data(DATAKEY_NODE_CACHE)
    if (node_cache.hasOwnProperty(node_id)) {
        return node_cache[node_id]
    }
    let row = ($table.find(`tr[${ATTR_ID}="${node_id}"]`) as JQueryRow).first() // expensive search
    if (row.length == 0) {
        throw `Node "${node_id}" not found`
    }
    node_cache[node_id] = row
    return row
}

/**
 * Returns the JQuery object of a wanted row from either the JQuery object or its name.
 * USed for public functions where we don't know if the user will provide an ID or a JQuery object
 * @param $table The JQuery table
 * @param arg The JQuery object or the textual ID of the wanted row
 * @returns The JQuery object referencing the desired row
 */
function _get_row_from_node_or_row($table: JQueryTable, arg: JQueryRow | string): JQueryRow {
    let tr: JQueryRow
    if (typeof arg === "string") {
        tr = _find_row($table, arg)
    } else {
        tr = arg
    }
    return tr
}

/**
 * Returns the list of immediate children of a given row
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @returns A JQuery array of row element
 */
function _get_children($table: JQueryTable, tr: JQueryRow): JQueryRow {
    const parent_id = _get_node_id(tr)
    return $table.find(`tr[${ATTR_PARENT}="${parent_id}"]`) as JQueryRow
}

/**
 * Returns the parent row of a given row. Returns null if there is no parent (i.e. the queried row was a root node)
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @returns The parent row or null if there is node
 */
function _get_parent($table: JQueryTable, tr: JQueryRow): JQueryRow | null {
    const parent_id = _get_parent_id(tr)
    if (parent_id == null) {
        return null
    }

    return _find_row($table, parent_id)
}

/**
 * Returns all visible rows in the table that match th given filter and that are under the given parent
 * @param $table The JQuery Table
 * @param parent The parent node. Look at all nodes if null
 * @param filter An optional filter to apply on the output dataset
 * @returns The visible rows under given parent that match the given filter
 */
function _get_visible_rows($table: JQueryTable, parent: JQueryRow | null, filter?: string): JQueryRow {
    let rows: JQueryRow
    if (parent == null) {
        rows = $table.find(`tbody tr:not(.${CLASS_HIDDEN})`) as JQueryRow
    } else {
        rows = _select_all_loaded_descendant($table, parent, `tr:not(.${CLASS_HIDDEN})`)
    }

    if (typeof filter !== "undefined") {
        rows.filter(filter)
    }

    return rows
}

/**
 * Returns the parent ID (not HTML ID) of a given row
 * @param tr The JQuery row
 * @returns The parent ID of the queried row
 */
function _get_parent_id(tr: JQueryRow): string | null {
    if (_is_root(tr)) {
        return null
    }
    const parent_id = tr.attr(ATTR_PARENT)
    if (typeof parent_id === "undefined") {
        return null
    }

    return parent_id
}

/**
 * Returns a boolean indicating if the node is a root node
 * @param tr The JQuery row
 * @returns true if the node is a root node
 */
function _is_root(tr: JQueryRow): boolean {
    return _get_nesting_level(tr) == 0
}

/**
 * Returns the root node that contains the given row
 * @param $table The JQuery table
 * @param row The given row
 * @returns The root node
 */
function _get_root_node_of($table: JQueryTable, row: JQueryRow) {
    let parent = _get_parent($table, row)
    while (parent !== null) {
        row = parent
        parent = _get_parent($table, row)
    }
    return row
}

/**
 * Tells if the children of a given row has been loaded
 * @param tr The JQuery row
 * @returns True if they are loaded
 */
function _is_children_loaded(tr: JQueryRow): boolean {
    let loaded = tr.attr(ATTR_CHILDREN_LOADED)
    if (loaded === "1") {
        return true
    }
    return false
}

/**
 * Tells if a row is presently expanded (instead of collapsed)
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @returns true if expanded, false otherwise
 */
function _is_expanded($table: JQueryTable, tr: JQueryRow): boolean {
    try {
        return _get_row_header_block($table, tr).find(`.${CLASS_EXPANDER}`).hasClass(`${CLASS_EXPANDER_OPENED}`)
    } catch (err) {
        return false
    }
}

/**
 * Returns the number of immediate children under the given row
 * @param tr The JQuery row
 * @returns Number of children
 */
function _get_children_count(tr: JQueryRow): number {
    try {
        let count = parseInt(tr.attr(ATTR_CHILDREN_COUNT) as string)
        if (isNaN(count)) {
            count = 0
        }
        return count
    } catch (err) {
        return 0
    }
}

/**
 * Returns the cell in which the tree stuff is inserted (within a header block)
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @returns The cell containing the Tree (the header block)
 */
function _get_tree_cell($table: JQueryTable, tr: JQueryRow): JQueryCell {
    let tree_col_index = _get_options($table).col_index
    let tree_cell = (tr.find(`td:nth-child(${tree_col_index})`) as JQueryCell).first() // First cell, the one with the tree behavior
    if (tree_cell.length == 0) {
        throw "No cell in row"
    }
    return tree_cell
}

/**
 * Find the header block element that this plugin insert in the column used to make a tree.
 * This header contains all the buttons and spacers to give a feeling of a tree
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @returns The header block element
 */
function _get_row_header_block($table: JQueryTable, tr: JQueryRow): JQuery {
    let tree_cell = _get_tree_cell($table, tr)
    let header_block = tree_cell.find(`.${CLASS_HEADER}`).first()
    if (header_block.length == 0) {
        throw "No header block in row"
    }
    return header_block
}

/**
 * Tells if a row is visible
 * @param tr The JQuery row
 * @returns true if visible
 */
function _is_visible(tr: JQueryRow): boolean {
    return !tr.hasClass(CLASS_HIDDEN)
}

/**
 * Return the nesting level of the given row. 0 means root node, 1 under a root node, and so forth
 * @param tr The JQuery row
 * @returns The nesting level
 */
function _get_nesting_level(tr: JQueryRow): number {
    const level = tr.attr(ATTR_LEVEL)
    if (typeof level == "undefined") {
        throw "No nesting level on node"
    }
    return parseInt(level)
}

/**
 * Change the expand/collapse icon to a collapsed state
 * @param $table The JQuery table
 * @param tr The JQuery row
 */
function _close_expander($table: JQueryTable, tr: JQueryRow): void {
    _get_row_header_block($table, tr)
        .find(`.${CLASS_EXPANDER}`)
        .removeClass(`${CLASS_EXPANDER_OPENED}`)
        .addClass(`${CLASS_EXPANDER_CLOSED}`)
}

/**
 * Change the expand/collapse icon to a expanded state
 * @param $table The JQuery table
 * @param tr The JQuery row
 */
function _open_expander($table: JQueryTable, tr: JQueryRow): void {
    _get_row_header_block($table, tr)
        .find(`.${CLASS_EXPANDER}`)
        .removeClass(`${CLASS_EXPANDER_CLOSED}`)
        .addClass(`${CLASS_EXPANDER_OPENED}`)
}

/**
 * Get the plugin options stored in the JQuery element
 * @param $table The JQuery table
 * @returns the plugin options
 */
function _get_options($table: JQuery): PluginOptionsFull {
    return $table.data(DATAKEY_OPTIONS) as PluginOptionsFull
}

/**
 * Loads the children of a given row sing the user `load_fn` option. Does nothing if already loaded.
 * The loaded children are hidden by default.
 * @param $table The JQuery table
 * @param tr the JQuery row
 * @returns The loaded rows
 */
function _load_children($table: JQueryTable, tr: JQueryRow): JQueryRow {
    if (_is_children_loaded(tr)) {
        return _get_children($table, tr)
    }
    const children_output: JQueryRow[] = []

    // Not loaded yet. Must load
    const node_id = _get_node_id(tr)
    const node_data = tr.data(DATAKEY_USER_DATA)
    let loaded_children = _get_options($table)["load_fn"](node_id, tr, node_data)
    if (typeof loaded_children === "undefined") {
        loaded_children = []
    }

    for (let i = 0; i < loaded_children.length; i++) {
        let child_node_id = loaded_children[i]["id"]
        const child_node_tr = $(loaded_children[i]["tr"]) as JQueryRow
        const no_children = loaded_children[i]["no_children"]
        const user_data = loaded_children[i]["user_data"]

        if (typeof child_node_id == "undefined") {
            child_node_id = _make_unique_id($table)
        }

        if (typeof child_node_tr == "undefined") {
            throw "Missing key 'tr' in load_fn under " + node_id
        }

        if (typeof user_data !== "undefined") {
            child_node_tr.data(DATAKEY_USER_DATA, user_data)
        }

        _add_node($table, node_id, child_node_id, child_node_tr, no_children)
        children_output.push(child_node_tr)
    }

    tr.attr(ATTR_CHILDREN_LOADED, "1")

    return $(children_output) as unknown as JQueryRow
}

/**
 * Loads all the descendant under a given row using the user `load_fn` option. Avoid loading twice the same children
 * @param $table The JQuery table
 * @param tr the JQuery row
 */
function _load_descendant($table: JQueryTable, tr: JQueryRow): void {
    _load_children($table, tr)
    _get_children($table, tr).each(function () {
        _load_descendant($table, $(this) as JQueryRow)
    })
}

/**
 * Fetch the list of root nodes in the table
 * @param $table The JQuery table
 * @returns List of root nodes
 */
function _get_root_nodes($table: JQueryTable): JQueryRow {
    return $table.find(`tr[${ATTR_LEVEL}="0"]`) as JQueryRow
}

/**
 * Loads all rows in the table, avoiding duplicate load.
 * @param $table the JQuery table
 */
function _load_all($table: JQueryTable): void {
    _get_root_nodes($table).each(function () {
        _load_descendant($table, $(this) as JQueryRow)
    })
}

/**
 * Tells if a given rows has the right to have children. Defined by the user `load_fn`.
 * Can be used to make the difference between a file or a folder. Folder can have children, files cannot.
 * @param tr The JQuery row
 * @returns True if the row can have children
 */
function _is_children_allowed(tr: JQueryRow): boolean {
    return !tr.hasClass(CLASS_NO_CHILDREN)
}

/**
 * Prevent a row from having children. Move, transfer, drag-n-drop will be denied if disallowed
 * @param tr The JQuery row
 */
function _disallow_children(tr: JQueryRow): void {
    tr.addClass(CLASS_NO_CHILDREN)
}

/**
 * Allow a row from having children. Move, transfer, drag-n-drop will be able to add a another row under this one
 * @param tr The JQuery row
 */
function _allow_children(tr: JQueryRow): void {
    tr.removeClass(CLASS_NO_CHILDREN)
}

/**
 * Make a visual row expandable by adding the expander icon and adding the right callbacks.
 * @param $table The JQuery table
 * @param tr The JQuery row
 */
function _make_expandable($table: JQueryTable, tr: JQueryRow): void {
    const header_block = _get_row_header_block($table, tr)
    if (header_block.find(`.${CLASS_EXPANDER}`).length == 0) {
        const expander = $table.data(DATAKEY_EXPANDER_CLOSED).clone()
        header_block.find(`.${CLASS_SPACER}`).first().append(expander)
        expander.click(function () {
            _toggle_row($table, tr)
        })
    }
}

/**
 * Make a row non expandable by removing the expander icon
 * @param $table The JQuery table
 * @param tr The JQuery row
 */
function _make_non_expandable($table: JQueryTable, tr: JQueryRow): void {
    const header_block = _get_row_header_block($table, tr)
    const expander = header_block.find(`.${CLASS_EXPANDER}`)
    if (expander.length > 0) {
        expander.remove()
    }
}

/**
 * Make visible all the rows that should be visible starting from a given row and going inward (deeper in the tree)
 * @param $table The JQuery table
 * @param tr The JQuery row used as starting point
 */
function _show_children_of_expanded_recursive($table: JQueryTable, tr: JQueryRow): void {
    _get_children($table, tr).each(function () {
        const child = $(this) as JQueryRow
        _show_row(child)
        if (_is_expanded($table, child)) {
            _show_children_of_expanded_recursive($table, child)
        }
    })
}

/**
 * Expands the given row, making the immediate children visible and also children of children if they are already expanded.
 * @param $table The JQuery table
 * @param tr The JQuery row to expand
 */
function _expand_row($table: JQueryTable, tr: JQueryRow): void {
    const children = _load_children($table, tr)
    if (children.length > 0) {
        // Iterate all immediate children
        children.each(function () {
            const child = $(this) as JQueryRow
            _show_row(child)
            _load_children($table, child)
            // Show children of children if they are already expanded. Consider the case where we have 10 levels of expanded rows
            // and level 1 is collapsed, then re-expanded. We want to re-expand all 10 levels, avoiding the user to do 10 clicks again.
            _show_children_of_expanded_recursive($table, tr)
        })

        _open_expander($table, tr)
        tr.trigger(EVENT_EXPANDED, {
            node_id: _get_node_id(tr),
        })

        $table.trigger(EVENT_SIZE_CHANGED)
    } else {
        //throw 'Cannot expand row with no children'
    }
}

/**
 * Collapse a row if expanded. Expand a row if collapsed
 * @param $table The JQuery table
 * @param tr The JQuery row
 */
function _toggle_row($table: JQueryTable, tr: JQueryRow): void {
    if (_is_expanded($table, tr)) {
        _collapse_row($table, tr)
    } else {
        _expand_row($table, tr)
    }
}

/**
 * Make the immediate children of the given row invisible. Used when collapsing
 * @param $table The JQuery table
 * @param tr The JQuery row
 */
function _hide_children($table: JQueryTable, tr: JQueryRow): void {
    _get_children($table, tr).each(function () {
        const child = $(this) as JQueryRow
        _hide_row(child)
        _hide_children($table, child)
    })
}

/**
 * MAke a row hidden
 * @param tr The Row to hide
 */
function _hide_row(tr: JQueryRow) {
    tr.hide()
    tr.addClass(CLASS_HIDDEN) // We use that because :visible does not work with jsdom
}

/**
 * Makes a row visible
 * @param tr The row to show
 */
function _show_row(tr: JQueryRow) {
    tr.show()
    tr.removeClass(CLASS_HIDDEN) // We use that because :visible does not work with jsdom
}

/**
 * Collapse a row so that all the descendants are hidden. Does not collapse children that have children themselves
 * @param $table The JQuery table
 * @param tr The JQuery row to collapse
 */
function _collapse_row($table: JQueryTable, tr: JQueryRow): void {
    _hide_children($table, tr) // Just hide, no collapse to keep state of children
    _close_expander($table, tr)
    tr.trigger(EVENT_COLLAPSED, {
        node_id: _get_node_id(tr),
    })

    $table.trigger(EVENT_SIZE_CHANGED)
}

/**
 * Expand every row in the table
 * @param $table The JQuery table
 */
function _expand_all($table: JQueryTable): void {
    _get_root_nodes($table).each(function () {
        _expand_descendent($table, $(this) as JQueryRow)
    })
}

function _expand_descendent($table: JQueryTable, tr: JQueryRow): void {
    _expand_row($table, tr)
    _get_children($table, tr).each(function () {
        _expand_descendent($table, $(this))
    })
}

/**
 * Collapse every row under the given row or in the whole table if no row is given.
 * Children of children will be collapsed as well.
 * @param $table The JQuery table
 * @param tr The row collapsing cascade start point. All rows collapsed if not provided
 */
function _collapse_all($table: JQueryTable, tr?: JQueryRow): void {
    if (typeof tr == "undefined") {
        _get_root_nodes($table).each(function () {
            const root_node = $(this) as JQueryRow
            _collapse_all($table, root_node)
            if (_is_expanded($table, root_node)) {
                _collapse_row($table, root_node)
            }
        })
    } else {
        _get_children($table, tr).each(function () {
            const child = $(this) as JQueryRow
            _collapse_all($table, child) // Recursion before collapse to start by the end leaf
            if (_is_expanded($table, child)) {
                _collapse_row($table, child)
            }
        })
    }
}

/**
 * Modify by a delta the number of children under a node.
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @param delta The number of children added (positive number) or removed (negative number)
 */
function _increase_children_count($table: JQueryTable, tr: JQueryRow, delta: number): void {
    let actual_count = parseInt(tr.attr(ATTR_CHILDREN_COUNT) as string)
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

/**
 * Adds a node to the table
 * @param $table The JQuery table
 * @param parent_id The ID of the parent row. null to get a root node
 * @param node_id The node ID to attribute to this row
 * @param tr The JQuery row to add
 * @param no_children true to prevent this row from having children
 */
function _add_node($table: JQueryTable, parent_id: string | null, node_id: string | null, tr: JQueryRow, no_children?: boolean): void {
    if (typeof no_children === "undefined") {
        no_children = false
    }

    if (node_id == null) {
        node_id = _make_unique_id($table)
    }

    const tree_cell = _get_tree_cell($table, tr)
    tree_cell.addClass(CLASS_TREE_CELL)

    if (no_children) {
        _disallow_children(tr)
    }

    let actual_level = 0 // Start at 0 for root node
    _set_node_id(tr, node_id)
    tr.addClass(CLASS_ROW)
    if (parent_id === null) {
        // We are adding a root node
        $table.append(tr)
        _show_row(tr)
        $table.trigger(EVENT_SIZE_CHANGED)
    } else {
        // We are adding a subnode
        const parent = _find_row($table, parent_id) // Find the parent row
        if (parent.length == 0) {
            throw "No parent node with ID " + parent_id
        }

        if (!_is_children_allowed(parent)) {
            throw `Cannot add node ${node_id}. Node id ${parent_id} cannot have children`
        }

        actual_level = _get_nesting_level(parent) + 1 // Level below the parent.
        // Since the table is flat, the insertion point is after the last element that share the same parent

        let previous_row = parent
        let actual_row = parent.next()
        while (_is_child_of(actual_row, parent_id)) {
            previous_row = actual_row
            actual_row = actual_row.next()
        }

        tr.insertAfter(previous_row)

        tr.attr(ATTR_PARENT, parent_id)
        _hide_row(tr)
        _increase_children_count($table, parent, 1)
    }

    let header_block = $("<div/>").addClass(CLASS_HEADER)
    tree_cell.prepend(header_block)

    const options = _get_options($table)

    if (options.draggable) {
        let dragger = DRAGGER_TEMPLATE.clone()
        header_block.prepend(dragger)
        dragger.attr("draggable", "true")
        dragger.on("dragstart", function (e: JQuery.DragEvent) {
            // Most reliable way to pass data is to store in global.
            // Attaching to the event is not reliable because chrome has some strict security policy
            // that makes the data unavailable in the dragmove event.
            if (typeof e.originalEvent == "undefined") {
                return
            }

            if (typeof e.originalEvent.dataTransfer == "undefined" || e.originalEvent.dataTransfer == null) {
                return
            }

            gbl_drag_data = {
                source_table_id: $table.attr("id") as string, // having an ID is mandatory for this plugin
                dragged_row_id: _get_node_id(tr),
            }

            e.originalEvent.dataTransfer.setDragImage(tr[0], 0, 0)
            e.originalEvent.dataTransfer.setData("scrutiny_tree_table.drag_data", JSON.stringify(gbl_drag_data))

            if (options.droppable) {
                _select_all_loaded_descendant($table, tr).addClass(CLASS_DISABLED)
            }
        })

        dragger.on("dragend", function (e: JQuery.DragEvent) {
            gbl_drag_data = null
            if (options.droppable) {
                $table.find(`tr.${CLASS_DISABLED}`).removeClass(CLASS_DISABLED)
            }
            $table.find(`.${CLASS_HIGHLIGHTED}`).removeClass(CLASS_HIGHLIGHTED)
        })
    }

    if (options.droppable) {
        tr.on("dragover", function (e) {
            if (gbl_drag_data == null) {
                return
            }

            if (typeof e.pageY == "undefined") {
                return
            }

            const source_table = $(`#${gbl_drag_data.source_table_id}`) as JQueryTable
            const dest_table = $table
            const dragged_tr = _find_row(source_table, gbl_drag_data.dragged_row_id)
            const dnd_result = _get_dragndrop_result(dest_table, dragged_tr, tr, e.pageY)
            if (dnd_result == null) {
                return
            }
            const dest_options = _get_options(dest_table)
            if (!dest_table.is(source_table)) {
                if (dest_options.transfer_policy_fn == null) {
                    return
                }
                const transfer_policy = dest_options.transfer_policy_fn(
                    source_table,
                    dest_table,
                    dragged_tr,
                    dnd_result.new_parent_id,
                    dnd_result.after_tr_id
                )
                if (typeof transfer_policy === "undefined") {
                    return
                }
                if (transfer_policy.scope == TransferScope.NONE) {
                    return
                }
            }

            dest_table.find(`tr.${CLASS_INSERT_BELOW}`).removeClass(CLASS_INSERT_BELOW)
            dest_table.find(`tr.${CLASS_INSERT_ABOVE}`).removeClass(CLASS_INSERT_ABOVE)

            if (dnd_result == null) {
                dest_table.find("tr").removeClass(CLASS_HIGHLIGHTED)
                return
            }

            if (dnd_result.new_parent_id != null) {
                dest_table.find(`tr.${CLASS_HIGHLIGHTED}`).removeClass(CLASS_HIGHLIGHTED)
                const new_parent_tr = _find_row(dest_table, dnd_result.new_parent_id)
                const descendant = _select_all_loaded_descendant(dest_table, new_parent_tr)
                descendant.addClass(CLASS_HIGHLIGHTED)
            } else {
                dest_table.find("tr").removeClass(CLASS_HIGHLIGHTED)
            }

            if (dnd_result.insert_line_display.row_id != null) {
                const insert_line_tr = _find_row(dest_table, dnd_result.insert_line_display.row_id)
                if (dnd_result.insert_line_display.insert_type == INSERT_TYPE_ABOVE) {
                    insert_line_tr.addClass(CLASS_INSERT_ABOVE)
                    let prev_row = (insert_line_tr.prevAll(`tr:not(.${CLASS_HIDDEN})`) as JQueryRow).first()
                    if (prev_row.length == 0) {
                        prev_row = (dest_table.find("thead:first tr:last") as JQueryRow).first()
                    }
                    prev_row.addClass(CLASS_INSERT_BELOW)
                } else if (dnd_result.insert_line_display.insert_type == INSERT_TYPE_BELOW) {
                    insert_line_tr.addClass(CLASS_INSERT_BELOW)
                    insert_line_tr.nextAll(`tr:not(.${CLASS_HIDDEN})`).first().addClass(CLASS_INSERT_ABOVE)
                } else {
                    _stop_drop(dest_table)
                }
            }

            e.preventDefault() // Required for drop to work?
        })

        tr.on("drop", function (e: any) {
            _handle_drop($table, e, tr)
            e.stopPropagation()
        })

        tr.on("dragexit", function () {
            _stop_drop($table)
        })
    }

    header_block.prepend(SPACER_TEMPLATE.clone())
    _set_nesting_level($table, tr, actual_level)
}

function _handle_drop($table: JQueryTable, e: any, drop_tr: JQueryRow | null) {
    const options = _get_options($table)
    if (options.droppable) {
        if (gbl_drag_data == null) {
            return
        }

        if (typeof e.pageY == "undefined") {
            return
        }

        const dest_table = $table
        const source_table = $(`#${gbl_drag_data.source_table_id}`) as JQueryTable
        const dragged_tr = _find_row(source_table, gbl_drag_data.dragged_row_id)
        const dnd_result = _get_dragndrop_result(dest_table, dragged_tr, drop_tr, e.pageY)
        let moved_rows: JQueryRow | null = null
        let transfer_result: ReturnType<typeof _transfer_row>
        try {
            if (dnd_result == null) {
                if (!dest_table.is(source_table)) {
                    // Artificial drop triggered by the user
                    transfer_result = _transfer_row(source_table, dest_table, dragged_tr, null, null)
                    moved_rows = transfer_result === null ? null : transfer_result.dest_rows
                } else {
                    return
                }
            } else {
                if (dest_table.is(source_table)) {
                    moved_rows = _move_row($table, dragged_tr, dnd_result.new_parent_id, dnd_result.after_tr_id)
                } else {
                    transfer_result = _transfer_row(source_table, dest_table, dragged_tr, dnd_result.new_parent_id, dnd_result.after_tr_id)
                    moved_rows = transfer_result === null ? null : transfer_result.dest_rows
                }

                if (moved_rows != null) {
                    moved_rows.addClass(CLASS_JUST_DROPPED)

                    dest_table.trigger(EVENT_DROPPED, {
                        source_table: source_table,
                        dest_table: dest_table,
                        rows: moved_rows,
                    })

                    setTimeout(function () {
                        ;(moved_rows as JQueryRow).css("transition", `background-color ${options.just_dropped_transition_length}s`)
                        setTimeout(function () {
                            ;(moved_rows as JQueryRow).removeClass(CLASS_JUST_DROPPED)
                            setTimeout(function () {
                                ;(moved_rows as JQueryRow).css("transition", "")
                            }, options.just_dropped_transition_length * 1000)
                        }, 0)
                    }, 0)
                }
            }
        } catch (e) {
            _stop_drop(dest_table)
            throw e
        }
        _stop_drop(dest_table)
        _stop_drop(source_table)
    }
}

/**
 * Remove all visual artifacts coming from a drag-n-drop event.
 * @param $table The JQuery table
 */
function _stop_drop($table: JQuery): void {
    $table.find(`tr.${CLASS_INSERT_BELOW}`).removeClass(CLASS_INSERT_BELOW)
    $table.find(`tr.${CLASS_INSERT_ABOVE}`).removeClass(CLASS_INSERT_ABOVE)
    $table.find(`tr.${CLASS_HIGHLIGHTED}`).removeClass(`${CLASS_HIGHLIGHTED}`)
}

interface DragNDropResult {
    new_parent_id: string | null
    after_tr_id: string | null
    insert_line_display: {
        row_id: string | null
        insert_type: number | null
    }
}

/**
 * Computes the action that a drag-n-drop should generate (moving a row, where and under which row)
 * @param $table The JQuery table on which the element is or will be dropped
 * @param dragged_tr The row being dragged
 * @param hover_tr The row under the cursor. Children of this row are expected to be loaded
 * @param cursorY The absolute Y position of the cursor
 * @returns A structure telling where to insert the row and under which parent
 */
function _get_dragndrop_result(
    $table: JQueryTable,
    dragged_tr: JQueryRow,
    hover_tr: JQueryRow | null,
    cursorY: number
): DragNDropResult | null {
    if (hover_tr == null) {
        return null
    }

    if (hover_tr.length == 0) {
        return null
    }

    if (hover_tr.is(dragged_tr) || _is_descendant($table, hover_tr, dragged_tr)) {
        return null
    }

    let result: DragNDropResult = {
        new_parent_id: null,
        after_tr_id: null,
        insert_line_display: {
            row_id: null,
            insert_type: null,
        },
    }

    const hover_tr_id = hover_tr == null ? null : _get_node_id(hover_tr)
    const hover_prev_tr = hover_tr.prevAll(`tr:not(.${CLASS_HIDDEN})`).first()
    const hover_prev_tr_id = hover_prev_tr.length == 0 ? null : _get_node_id(hover_prev_tr)
    const hover_next_tr = hover_tr.nextAll(`tr:not(.${CLASS_HIDDEN})`).first()
    const hover_next_tr_id = hover_next_tr.length == 0 ? null : _get_node_id(hover_next_tr)

    const insert_type = _get_row_insert_type(hover_tr, cursorY)
    result.insert_line_display.insert_type = insert_type

    if (insert_type == INSERT_TYPE_INTO) {
        const last_child = _get_children($table, hover_tr).last() as JQueryRow
        result.new_parent_id = hover_tr_id
        result.after_tr_id = last_child.length == 0 ? null : _get_node_id(last_child)
        result.insert_line_display.row_id = null
    } else if (insert_type == INSERT_TYPE_BELOW) {
        result.insert_line_display.row_id = hover_tr_id // Display the insert line after the hover line
        if (hover_next_tr_id == null) {
            // Last line of table
            const last_root_node = _get_root_nodes($table).last()
            result.new_parent_id = null // Make a root node
            result.after_tr_id = last_root_node.length == 0 ? null : _get_node_id(last_root_node) // Right after the hovering row
        } else {
            const next_tr_parent = _get_parent($table, hover_next_tr)
            const next_tr_prev_same_level = _get_prev_same_level(hover_next_tr)
            result.new_parent_id = next_tr_parent == null ? null : _get_node_id(next_tr_parent)
            result.after_tr_id = next_tr_prev_same_level == null ? null : _get_node_id(next_tr_prev_same_level)
        }
    } else if (insert_type == INSERT_TYPE_ABOVE) {
        result.insert_line_display.row_id = hover_tr_id
        if (hover_prev_tr_id == null) {
            result.new_parent_id = null // Make a root node
            result.after_tr_id = null // First root node
        } else {
            const hover_tr_parent = _get_parent($table, hover_tr)
            const hover_tr_prev_same_level = _get_prev_same_level(hover_tr)
            result.new_parent_id = hover_tr_parent == null ? null : _get_node_id(hover_tr_parent)
            result.after_tr_id = hover_tr_prev_same_level == null ? null : _get_node_id(hover_tr_prev_same_level)
        }
    }

    return result
}

/**
 * Returns the next JQuery row found after a given row, at the same level. (ignoring the descendant in between)
 * @param tr The starting JQuery row
 * @returns Next row or null if there's none
 */
function _get_next_same_level(tr: JQueryRow): JQueryRow | null {
    let target_nesting = _get_nesting_level(tr)
    let actual_tr = tr
    let next_tr = tr.next()
    while (next_tr.length != 0) {
        let next_tr_nesting_level = _get_nesting_level(next_tr)
        if (next_tr_nesting_level == target_nesting) {
            return next_tr
        }

        if (next_tr_nesting_level < target_nesting) {
            return null
        }

        let temp = actual_tr.next()
        actual_tr = next_tr
        next_tr = temp
    }

    return null
}

/**
 * Returns the previous JQuery row found after a given row, at the same level. (ignoring the descendant in between)
 * @param tr The starting JQuery row
 * @returns previous row or null if there's none
 */
function _get_prev_same_level(tr: JQueryRow): JQueryRow | null {
    let target_nesting = _get_nesting_level(tr)
    let actual_tr = tr
    let prev_tr = tr.prev()
    while (prev_tr.length != 0) {
        let prev_tr_nesting_level = _get_nesting_level(prev_tr)
        if (prev_tr_nesting_level == target_nesting) {
            return prev_tr
        }

        if (prev_tr_nesting_level < target_nesting) {
            return null
        }

        let temp = actual_tr.prev()
        actual_tr = prev_tr
        prev_tr = temp
    }

    return null
}

/**
 * Sets the nesting level (depth in the tree) of a given row
 * @param $table The JQuery table
 * @param tr The JQuery row
 * @param level The requested nesting level
 */
function _set_nesting_level($table: JQueryTable, tr: JQueryRow, level: number) {
    let options = _get_options($table)
    const expander_size = options.expander_size
    const spacer_width = options.indent * level + expander_size + "px"
    tr.attr(ATTR_LEVEL, level)
    let header_block = _get_row_header_block($table, tr)
    let spacer = header_block.find(`.${CLASS_SPACER}`)
    spacer.css("width", spacer_width)
}

/**
 * Returns the type of insertion that a cursor position should do. Above if the cursor is at the tope of the row,
 * below if the cursor is at the bottom of the row. Into if the cursor is in the middle AND children are allowed
 * @param tr The target row
 * @param cursorY Absolute Y position of the cursor
 * @returns Type of insert (above, into, below)
 */
function _get_row_insert_type(tr: JQueryRow, cursorY: number): number {
    const tr_height = tr.outerHeight() as number
    const tr_offset = tr.offset()
    if (typeof tr_height === "undefined" || typeof tr_offset === "undefined") {
        throw "Cannot read dragged row position"
    }
    const children_allowed = _is_children_allowed(tr)
    const relativeY = cursorY - tr_offset.top
    if (children_allowed) {
        const fraction_height = tr_height / 4
        if (relativeY < 1 * fraction_height) {
            return INSERT_TYPE_ABOVE
        } else if (relativeY > 3 * fraction_height) {
            return INSERT_TYPE_BELOW
        } else {
            return INSERT_TYPE_INTO
        }
    } else {
        const fraction_height = tr_height / 2
        if (relativeY < fraction_height) {
            return INSERT_TYPE_ABOVE
        } else {
            return INSERT_TYPE_BELOW
        }
    }
}

/**
 * Removes a row from the table and all its descendants
 * @param $table The JQuery table
 * @param tr The row to remove
 * @param no_event : When true, prevent the plugin from firing a size-change event on node deletion
 */
function _delete_node($table: JQueryTable, tr: JQueryRow, no_event: boolean = false): void {
    _get_children($table, tr).each(function () {
        _delete_node($table, $(this), true)
    })

    _delete_single_row($table, tr, no_event)
}

/**
 * Delete a row from the table, leaves the descendants untouched
 * @param $table The JQuery table
 * @param tr The row to delete
 * @param no_event When true, does not fire an change event after deleting the node
 */
function _delete_single_row($table: JQueryTable, tr: JQueryRow, no_event: boolean = false): void {
    const node_cache = $table.data(DATAKEY_NODE_CACHE)
    const node_id = _get_node_id(tr)
    const parent = _get_parent($table, tr)
    if (node_cache.hasOwnProperty(node_id)) {
        delete node_cache[node_id]
    }
    tr.remove()
    if (!no_event) {
        $table.trigger(EVENT_SIZE_CHANGED)
    }

    if (parent !== null) {
        _increase_children_count($table, parent, -1)
    }
}

/**
 * Moves a row within the same table under an optional parent row and after an optional reference row
 *
 * @param $table Jquery table object
 * @param tr The Jquery row to move
 * @param new_parent_id The ID of the new parent row in the table. If not set or null, the row
 * will become a root node
 * @param after_node_id The row after which the moved row will be inserted. If not set or null,
 * the moved row will be set in last position
 * @returns The rows moved
 */
function _move_row($table: JQueryTable, tr: JQueryRow, new_parent_id: string | null, after_node_id: string | null): JQueryRow {
    let tr_id = _get_node_id(tr)
    //console.debug(`Moving ${tr_id}. Parent=${new_parent_id}. After=${after_node_id}`)
    const tree_to_move = _select_all_loaded_descendant($table, tr)
    const tr_original_parent = _get_parent($table, tr)
    let new_nesting_level: number | null = null
    if (new_parent_id == null) {
        new_nesting_level = 0
        if (after_node_id == null) {
            $table.find("tbody").prepend(tree_to_move)
        } else {
            const after_tr = _find_row($table, after_node_id)
            if (!_is_root(after_tr)) {
                throw `Cannot insert a root node after node ${after_node_id} because it is not a root node itself`
            }

            if (tr_id != after_node_id) {
                tree_to_move.attr(ATTR_MOVING, "1")
                let after_tr_last_descendant = _select_all_loaded_descendant($table, after_tr, `tr[${ATTR_MOVING}!="1"]`).last()
                tree_to_move.attr(ATTR_MOVING, "")
                if (!after_tr_last_descendant.is(tree_to_move.first())) {
                    // Already at the right place.
                    after_tr_last_descendant.after(tree_to_move)
                }
            }
        }

        tr.attr(ATTR_PARENT, null)
    } else {
        const new_parent_row = _find_row($table, new_parent_id)

        if (!_is_children_allowed(new_parent_row)) {
            throw `Cannot move node ${tr_id}. Node ${new_parent_id} does not allow children`
        }

        tree_to_move.each(function () {
            if ($(this).is(new_parent_row)) {
                throw "Cannot move a tree within itself"
            }
        })

        new_nesting_level = _get_nesting_level(new_parent_row) + 1
        _load_children($table, new_parent_row)

        if (after_node_id == null) {
            new_parent_row.after(tree_to_move)
        } else {
            const after_tr = _find_row($table, after_node_id)
            const after_parent_row = _get_parent($table, after_tr)

            if (after_parent_row == null || !after_parent_row.is(new_parent_row)) {
                throw 'Given "after_row" is not a child of given "parent_row"'
            }

            if (tr_id != after_node_id) {
                tree_to_move.attr(ATTR_MOVING, "1")
                const after_tr_last_descendant = _select_all_loaded_descendant($table, after_tr, `tr[${ATTR_MOVING}!="1"]`).last()
                tree_to_move.attr(ATTR_MOVING, "")
                if (!after_tr_last_descendant.is(tree_to_move.first())) {
                    // Already at the right place.
                    after_tr_last_descendant.after(tree_to_move)
                }
            }
        }
        tr.attr(ATTR_PARENT, new_parent_id)
        _increase_children_count($table, new_parent_row, 1)
        _expand_row($table, new_parent_row)
    }

    if (tr_original_parent != null) {
        _increase_children_count($table, tr_original_parent, -1)
    }

    let previous_nesting_level = _get_nesting_level(tr)
    let delta_nesting_level = new_nesting_level - previous_nesting_level
    tree_to_move.each(function () {
        _set_nesting_level($table, $(this), _get_nesting_level($(this)) + delta_nesting_level)
    })

    $table.trigger(EVENT_SIZE_CHANGED)
    return tree_to_move
}

/**
 * Moves a row from the table to the given destination table under an optional parent row
 * and after an optional reference row.
 *
 * @param $table Source table
 * @param dest_table Destination table
 * @param row_id The Jquery row to transfer
 * @param new_parent_id The ID of the new parent row in the destination table. If not set or null, the row
 * will become a root node in the destination table
 * @param after_node_id The row after which the transferred row will be inserted. If not set or null,
 * the transferred row will be set in last position
 * @returns The list of rows transferred
 */
function _transfer_row(
    source_table: JQueryTable,
    dest_table: JQueryTable,
    tr: JQueryRow,
    new_parent_id?: string | null,
    after_node_id?: string | null
): TransferResult | null {
    /*Transfer a node from a table to another one */
    const dest_options = _get_options(dest_table)

    if (dest_options.transfer_policy_fn == null) {
        throw "Node transfer from another table is not supported"
    }

    if (typeof new_parent_id === "undefined") {
        new_parent_id = null
    }
    if (typeof after_node_id === "undefined") {
        after_node_id = null
    }

    const transfer_policy = dest_options.transfer_policy_fn(source_table, dest_table, tr, new_parent_id, after_node_id)

    if (typeof transfer_policy === "undefined") {
        throw "Invalid transfer policy returned by transfer_policy_fn"
    }

    if (transfer_policy.scope == TransferScope.NONE) {
        return null
    }

    if (dest_options.transfer_fn == null) {
        throw "Node transfer from another table is not supported"
    }

    let lines_to_moves: JQueryRow | null = null

    if (transfer_policy.scope == TransferScope.ROW_ONLY) {
        lines_to_moves = tr
    } else if (transfer_policy.scope == TransferScope.VISIBLE_ONLY) {
        lines_to_moves = _get_visible_rows(source_table, tr) as JQueryRow
    } else if (transfer_policy.scope == TransferScope.ALL) {
        lines_to_moves = _load_and_select_all_descendant(source_table, tr) as JQueryRow
    } else {
        throw "Invalid transfer policy returned by transfer_policy_fn"
    }

    let old_id_to_new_id_map: Record<string, string> = {}
    let new_tr_by_new_id: Record<string, JQueryRow> = {}

    for (let i = 0; i < lines_to_moves.length; i++) {
        const original_line = $(lines_to_moves[i])
        const original_id = _get_node_id(original_line)
        const original_parent_id = _get_parent_id(original_line)
        const original_user_data = $(original_line).data(DATAKEY_USER_DATA)
        const bare_line = _make_bare_node_copy(original_line)
        const meta = {
            original_id: original_id,
            original_parent_id: original_parent_id,
            user_data: original_user_data,
        }
        const transferred_row_data: TransferFunctionOutput = dest_options.transfer_fn(source_table, bare_line, meta)

        let new_id = transferred_row_data["id"]
        let new_tr = transferred_row_data["tr"]

        if (typeof new_tr == "undefined") {
            throw "Missing key 'tr' in transfer_fn under " + new_id
        }

        new_tr = $(new_tr) as JQueryRow

        if (typeof new_id == "undefined" || new_id == null) {
            new_id = _make_unique_id(dest_table)
        }

        old_id_to_new_id_map[original_id] = new_id
        new_tr.data(DATAKEY_USER_DATA, $(original_line).data(DATAKEY_USER_DATA))
        new_tr_by_new_id[new_id] = new_tr
    }

    const already_loaded_nodes: Set<string> = new Set()
    lines_to_moves.each(function () {
        const original_line = $(this) as JQueryRow
        const original_parent_id = _get_parent_id(original_line)
        const no_children = !_is_children_allowed(original_line)
        const original_id = _get_node_id(original_line)
        const new_id = old_id_to_new_id_map[original_id]
        const new_tr = new_tr_by_new_id[new_id]

        let converted_parent_id: string | null = null
        if (original_parent_id != null && old_id_to_new_id_map.hasOwnProperty(original_parent_id)) {
            converted_parent_id = old_id_to_new_id_map[original_parent_id]
        }

        // We mark that the children are loaded only if we've transferred childrens.
        // We assume all children or none ar transferred here. Partial children should not happen... for now.
        if (original_parent_id !== null && typeof old_id_to_new_id_map[original_parent_id] !== "undefined") {
            already_loaded_nodes.add(old_id_to_new_id_map[original_parent_id])
        }

        _add_node(dest_table, converted_parent_id, new_id, new_tr, no_children)
    })

    // Mark loaded rows for which we saw children
    already_loaded_nodes.forEach(function (node_id) {
        _find_row(dest_table, node_id).attr(ATTR_CHILDREN_LOADED, "1")
    })

    const new_top_node_id = old_id_to_new_id_map[_get_node_id(tr)]
    const new_top_row = _find_row(dest_table, new_top_node_id)
    const dest_rows = _move_row(dest_table, new_top_row, new_parent_id, after_node_id)

    return {
        source_rows: lines_to_moves,
        dest_rows: dest_rows,
        id_map: old_id_to_new_id_map,
    }
}

/**
 * Returns a copy of the given JQuery row and removes all the data added by this plugin
 * @param tr The JQuery row to copy
 * @returns A new JQuery row
 */
function _make_bare_node_copy(tr: JQueryRow): JQueryRow {
    tr = tr.clone()
    tr.find(`.${CLASS_HEADER}`).remove()
    tr.removeClass(CLASS_DISABLED)
        .removeClass(CLASS_HIGHLIGHTED)
        .removeClass(CLASS_INSERT_ABOVE)
        .removeClass(CLASS_INSERT_BELOW)
        .removeClass(CLASS_ROW)
        .removeClass(CLASS_HIDDEN)
        .removeClass(CLASS_NO_CHILDREN)
        .removeAttr(ATTR_ID)
        .removeAttr(ATTR_LEVEL)
        .removeAttr(ATTR_CHILDREN_COUNT)
        .removeAttr(ATTR_CHILDREN_LOADED)
        .removeAttr(ATTR_MOVING)
        .removeAttr(ATTR_PARENT)
    tr.find(`.${CLASS_TREE_CELL}`).removeClass(CLASS_TREE_CELL)
    return $(tr[0])
}

/**
 * Returns all the descendants under a given row. The given row will be part of the output list
 * @param $table The JQuery table
 * @param tr The JQuery row parent of the wanted descendants
 * @param filter A JQuery filter to apply on the descendants
 * @returns The list of descendants, parent row included
 */
function _select_all_loaded_descendant($table: JQueryTable, tr: JQueryRow, filter?: string): JQueryRow {
    const result = _select_all_loaded_descendant_recursive($table, tr, filter)
    if (result == null) {
        throw "Did not get descendant results" // for static analyzer
    }
    return result as JQueryRow
}

/**
 *
 * @param $table The JQuery table
 * @param tr The JQuery row parent of the wanted descendants
 * @param filter A JQuery filter to apply on the descendants
 * @param arr An optional array for recursive patten. Internally set, should be unset by the user
 * @returns
 */
function _select_all_loaded_descendant_recursive(
    $table: JQueryTable,
    tr: JQueryRow,
    filter?: string | null,
    arr?: HTMLTableRowElement[]
): JQueryRow | null {
    /* Select a node and all its descendant, only the loaded ones */
    let return_val = false
    if (typeof arr === "undefined") {
        arr = []
        return_val = true
    }

    if (typeof filter === "undefined") {
        filter = null
    }

    if (filter != null) {
        tr = tr.filter(filter)
    }

    if (tr.length > 0) {
        arr.push(tr[0])
        let children = _get_children($table, tr)
        if (filter != null) {
            children.filter(filter)
        }
        children.each(function () {
            _select_all_loaded_descendant_recursive($table, $(this) as JQueryRow, filter, arr)
        })
    }

    if (return_val) {
        return $(arr)
    } else {
        return null // make static analyzer happy
    }
}

/**
 * Loads everything under a given row and returns the list of rows under the given row. The parent row will be part of the output list
 * @param $table The JQuery table
 * @param tr The JQuery row acting as the parent
 * @param arr An optional array for recursive patten. Internally set, should be unset by the user
 * @returns List of descendants under the given parent, including the parent itself
 */
function _load_and_select_all_descendant($table: JQueryTable, tr: JQueryRow, arr?: HTMLTableRowElement[]): JQueryRow | void {
    let return_val = false
    if (typeof arr === "undefined") {
        arr = []
        return_val = true
    }
    arr.push(tr[0])
    _load_children($table, tr)
    let children = _get_children($table, tr)
    children.each(function () {
        _load_and_select_all_descendant($table, $(this) as JQueryRow, arr)
    })

    if (return_val) {
        return $(arr)
    }
}

/**
 * Initialize the plugin on a HTML table
 * @param $table The JQuery table on which to apply this plugin
 * @param config The user configuration for the plugin
 */
function init($table: JQueryTable, config: PluginOptions): void {
    const options: PluginOptionsFull = $.extend({}, DEFAULT_OPTIONS, config)
    const table_id = $table.attr("id")
    if (typeof table_id === "undefined") {
        throw "TreeTable requires an id attribute work properly"
    }
    $table.addClass(CLASS_TABLE)

    let expander_size: string | number = options.expander_size
    if (typeof expander_size === "number") {
        expander_size = "" + expander_size + "px"
    } else {
        throw "Unsupported data type for options 'expander_size' : " + typeof expander_size
    }

    const expander_opened = EXPANDER_OPENED_TEMPLATE.clone()
    const expander_closed = EXPANDER_CLOSED_TEMPLATE.clone()
    const node_cache = {}

    expander_opened.css("width", expander_size).css("background-size", expander_size)
    expander_opened.css("height", expander_size).css("background-size", expander_size)
    expander_closed.css("width", expander_size).css("background-size", expander_size)
    expander_closed.css("height", expander_size).css("background-size", expander_size)

    $table.data(DATAKEY_EXPANDER_CLOSED, expander_closed)
    $table.data(DATAKEY_EXPANDER_OPENED, expander_opened)
    $table.data(DATAKEY_NODE_CACHE, node_cache)
    $table.data(DATAKEY_OPTIONS, options)

    if (options.resizable) {
        const resizableTable = $table as JQueryResizableTable
        if (typeof resizableTable.scrutiny_resizable_table === "undefined") {
            throw "Cannot make a resizable table. The scrutiny_resizable_table plugin is not available"
        }

        resizableTable.scrutiny_resizable_table(options.resize_options)

        resizableTable.on(EVENT_SIZE_CHANGED, function () {
            ;($(this) as JQueryResizableTable).scrutiny_resizable_table("refresh")
        })
    }
}

// public functions
const public_funcs: Record<string, Function> = {
    add_root_node: add_root_node,
    add_node: add_node,
    is_root: is_root,
    get_children: get_children,
    get_children_count: get_children_count,
    get_parent: get_parent,
    delete_node: delete_node,
    expand_node: expand_node,
    expand_all: expand_all,
    collapse_node: collapse_node,
    collapse_all: collapse_all,
    move_node: move_node,
    load_all: load_all,
    transfer_node_from: transfer_node_from,
    transfer_node_to: transfer_node_to,
    get_root_nodes: get_root_nodes,
    get_root_node_of: get_root_node_of,
    get_visible_nodes: get_visible_nodes,
    get_nodes: get_nodes,
    get_node_nesting_level: get_node_nesting_level,
}

export function scrutiny_treetable(...args: any[]) {
    let hasResults = false
    // @ts-ignore
    const results = $(this).map(function () {
        // @ts-ignore
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
            init($table, args[0])
        }
    })

    // When no result were provided, return the same `this` that we received
    if (!hasResults) {
        // @ts-ignore
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
