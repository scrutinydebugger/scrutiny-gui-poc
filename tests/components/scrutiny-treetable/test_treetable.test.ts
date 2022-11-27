//    test_treetable.test.ts
//        Test suite for the tree table plugin
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { scrutiny_treetable, PluginOptions as TreeTableOptions, ATTR_ID, ATTR_PARENT, ATTR_LEVEL } from "@scrutiny-treetable"
import { default as $ } from "@jquery"
import * as dom_testing_tools from "@tests/dom_testing_tools"
import * as assert from "assert"
import { get_load_fn, RootNode } from "./test_treetable_tools"
import * as testing_tools from "@tests/testing_tools"

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
interface JQueryScrutinyTable extends JQueryTable {
    tt: Function
}

var table_struct: RootNode = {
    root1: {
        cells: ["aaa", "bbb", "ccc"],
        children: {
            "node1.1": { cells: ["ddd", "eee", "fff"] },
            "node1.2": { cells: ["ggg", "hhh", "iii"] },
            "node1.3": {
                cells: ["jjj", "kkk", "lll"],
                children: {
                    "node1.3.1": { cells: ["mmm", "nnn", "ooo"] },
                    "node1.3.2": { cells: ["ppp", "qqq", "rrr"] },
                    "node1.3.3": { cells: ["sss", "ttt", "uuu"] },
                },
            },
            "node1.4": { cells: ["vvv", "www", "yyy"] },
        },
    },
    root2: {
        cells: ["aaa2", "bbb2", "ccc2"],
        children: {
            "node2.1": { cells: ["ddd2", "eee2", "fff2"] },
            "node2.2": { cells: ["ggg2", "hhh2", "iii2"] },
            "node2.3": {
                cells: ["jjj2", "kkk2", "lll2"],
                children: {
                    "node2.3.1": { cells: ["mmm2", "nnn2", "ooo2"] },
                    "node2.3.2": { cells: ["ppp2", "qqq2", "rrr2"] },
                    "node2.3.3": { cells: ["sss2", "ttt2", "uuu2"] },
                },
            },
            "node2.4": { cells: ["vvv2", "www2", "yyy2"] },
        },
    },
}

function get_row_ids(rows: JQueryRow) {
    let output: string[] = []
    rows.each(function () {
        output.push($(this).attr(ATTR_ID))
    })

    return output
}

interface PostMoveCheckParams {
    moved_node_id: string
    new_parent_id: string | null
    previous_parent_id: string | null
    immediate_before_id?: string | null
    immediate_after_id?: string | null
    before_id?: string | null
    after_id?: string | null
}

function post_move_check(table: JQueryScrutinyTable, params: PostMoveCheckParams) {
    if (params.new_parent_id != null) {
        dom_testing_tools.assert_same(
            table.tt("get_parent", params.moved_node_id),
            table.tt("get_nodes", params.new_parent_id),
            `Parent should be ${params.new_parent_id}`
        )

        testing_tools.assert_in(
            params.moved_node_id,
            get_row_ids(table.tt("get_children", params.new_parent_id)),
            `${params.moved_node_id} should be children of ${params.new_parent_id}`
        )

        const expected_nesting_level = table.tt("get_node_nesting_level", params.new_parent_id) + 1
        assert.equal(
            table.tt("get_node_nesting_level", params.moved_node_id),
            expected_nesting_level,
            `Nesting level of ${params.moved_node_id} should be ${expected_nesting_level}`
        )
    } else {
        assert.equal(true, table.tt("is_root", params.moved_node_id), `${params.moved_node_id} should be a root node`)

        testing_tools.assert_in(
            params.moved_node_id,
            get_row_ids(table.tt("get_root_nodes")),
            `${params.moved_node_id} should be part of the root nodes`
        )

        assert.equal(table.tt("get_node_nesting_level", params.moved_node_id), 0, `Nesting level of ${params.moved_node_id} should be 0`)
    }

    if (params.previous_parent_id != params.new_parent_id) {
        if (params.previous_parent_id !== null) {
            testing_tools.assert_not_in(
                params.moved_node_id,
                get_row_ids(table.tt("get_children", params.previous_parent_id)),
                `${params.moved_node_id} should not be children of ${params.previous_parent_id}`
            )
        } else {
            assert.equal(false, table.tt("is_root", params.moved_node_id))
        }
    }

    if (typeof params.immediate_after_id !== "undefined" && params.immediate_after_id !== null) {
        dom_testing_tools.assert_is_immediate_after(
            table.tt("get_nodes", params.moved_node_id),
            table.tt("get_nodes", params.immediate_after_id),
            `Node ${params.moved_node_id} should be immediately after ${params.immediate_after_id}`
        )
    }

    if (typeof params.immediate_before_id !== "undefined" && params.immediate_before_id !== null) {
        dom_testing_tools.assert_is_immediate_before(
            table.tt("get_nodes", params.moved_node_id),
            table.tt("get_nodes", params.immediate_before_id),
            `Node ${params.moved_node_id} should be immediately before ${params.immediate_before_id}`
        )
    }

    if (typeof params.after_id !== "undefined" && params.after_id !== null) {
        dom_testing_tools.assert_is_after(
            table.tt("get_nodes", params.moved_node_id),
            table.tt("get_nodes", params.after_id),
            `Node ${params.moved_node_id} should be after ${params.after_id}`
        )
    }

    if (typeof params.before_id !== "undefined" && params.before_id !== null) {
        dom_testing_tools.assert_is_before(
            table.tt("get_nodes", params.moved_node_id),
            table.tt("get_nodes", params.before_id),
            `Node ${params.moved_node_id} should be before ${params.before_id}`
        )
    }
}

describe("scrutiny-treetable", function () {
    let body = $("body") as JQuery<HTMLBodyElement>
    let table: JQueryScrutinyTable
    let tbody: JQuery<HTMLTableSectionElement>

    before(() => {
        $.extend($.fn, { tt: scrutiny_treetable })
    })

    beforeEach(() => {
        body.html("") // Clear body

        const table_id = "my_treetable"
        table = dom_testing_tools.make_table(table_id, 3) as JQueryScrutinyTable
        tbody = table.find("tbody")

        const options: TreeTableOptions = {
            load_fn: get_load_fn(table_struct, ["node2.2", "node2.3.3"]),
        }

        table.tt(options)

        // add_root_node
        let root_node_names = Object.keys(table_struct)
        root_node_names.forEach(function (name) {
            table.tt("add_root_node", name, dom_testing_tools.make_row_from_content(table_struct[name].cells))
        })
    })

    it("check_load_fn", function () {
        const loader = get_load_fn(table_struct)
        let rows = loader("root1", $("<tr />"))
        assert.equal(rows.length, 4)
        let children_list: string[] = []
        rows.forEach(function (node) {
            assert.notEqual(typeof node.id, "undefined")
            children_list.push(node.id as string)
        })
        testing_tools.assert_list_equal_unordered(children_list, ["node1.1", "node1.2", "node1.3", "node1.4"], "Check children of root1")

        rows = loader("node2.3", $("<tr />"))
        assert.equal(rows.length, 3)
        children_list = []
        rows.forEach(function (node) {
            assert.notEqual(typeof node.id, "undefined")
            children_list.push(node.id as string)
        })
        testing_tools.assert_list_equal_unordered(children_list, ["node2.3.1", "node2.3.2", "node2.3.3"], "Check children of node2.3")
    })

    it("Basic usage", function () {
        // get_visible_nodes
        let visible_rows = table.tt("get_visible_nodes") as JQueryRow
        assert.equal(visible_rows.length, 2, "Expect root node count")

        let expand_event_count = 0
        let collapse_event_count = 0

        table.on("stt.collapsed", function () {
            collapse_event_count++
        })

        table.on("stt.expanded", function () {
            expand_event_count++
        })

        // expand_node
        table.tt("expand_node", "root1")
        assert.equal(expand_event_count, 1)
        assert.equal(collapse_event_count, 0)

        // Nesting
        assert.equal(table.tt("get_node_nesting_level", "root1"), 0)
        assert.equal(table.tt("get_node_nesting_level", "node1.1"), 1)
        assert.equal(table.tt("get_node_nesting_level", "node1.2"), 1)
        assert.equal(table.tt("get_node_nesting_level", "node1.3.1"), 2)
        assert.equal(table.tt("get_node_nesting_level", "node1.3.2"), 2)

        // get_visible_nodes
        visible_rows = table.tt("get_visible_nodes") as JQueryRow
        assert.equal(visible_rows.length, 6, "Expect root node count after expand")

        testing_tools.assert_list_equal_unordered(
            get_row_ids(visible_rows),
            ["root1", "root2", "node1.1", "node1.2", "node1.3", "node1.4"],
            "visible row after expand"
        )

        // collapse_node
        table.tt("collapse_node", "root1")
        assert.equal(expand_event_count, 1)
        assert.equal(collapse_event_count, 1)

        // get_visible_nodes
        visible_rows = table.tt("get_visible_nodes") as JQueryRow
        assert.equal(visible_rows.length, 2, "Expect root node count after collpase")

        testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), ["root1", "root2"], "Visible rows after collapse")

        expand_event_count = 0
        collapse_event_count = 0
        // expand_all
        table.tt("expand_all")
        assert.equal(expand_event_count, 4, "Expand all number of even triggered")
        visible_rows = table.tt("get_visible_nodes") as JQueryRow
        testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), get_row_ids(tbody.find("tr")), "Visible rows after expand all")

        // collapse_all
        table.tt("collapse_all")
        assert.equal(collapse_event_count, 4, "Collapse all number of even triggered")
        visible_rows = table.tt("get_visible_nodes") as JQueryRow
        testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), ["root1", "root2"], "Visible rows after collapse all")

        // is_root
        assert.equal(table.tt("is_root", "root1"), true, "Expect root1 to be marked as root ")
        assert.equal(table.tt("is_root", "root2"), true, "Expect root2 to be marked as root ")
        assert.equal(table.tt("is_root", "node1.2"), false, "Expect node1.2 to be marked as non-root ")
        assert.equal(table.tt("is_root", "node1.3.1"), false, "Expect node1.3.1 to be marked as non-root ")

        // get_root_nodes
        let root_nodes = table.tt("get_root_nodes")
        assert.equal(root_nodes.length, 2, "Expect 2 root nodes")
        testing_tools.assert_list_equal_unordered(get_row_ids(root_nodes), ["root1", "root2"], "Expect root nodes list")

        // get_root_node_of
        let root = table.tt("get_root_node_of", "node1.3.2")
        testing_tools.assert_list_equal_unordered(get_row_ids(root), ["root1"], "Expect root of ndoe1.3.2 to be root1")

        // get_children_count
        assert.equal(table.tt("get_children_count", "node2.3"), 3, "Expect children count of node2.3 ")
        assert.equal(table.tt("get_children_count", "root1"), 4, "Expect children count root1")
        assert.equal(table.tt("get_children_count", "node1.3.1"), 0, "Expect children count node1.3.1")

        //get_children
        let root2_children = table.tt("get_children", "root2")
        testing_tools.assert_list_equal_unordered(
            get_row_ids(root2_children),
            ["node2.1", "node2.2", "node2.3", "node2.4"],
            "Expect children of root2"
        )

        //get_parent
        let parents = table.tt("get_parent", "node2.3.1")
        testing_tools.assert_list_equal_unordered(get_row_ids(parents), ["node2.3"], "Expect parent of node2.3.1")

        //get_nodes
        let nodes = table.tt("get_nodes", ["node2.3.1", "node1.2", "root2"])
        testing_tools.assert_list_equal_unordered(get_row_ids(nodes), ["node2.3.1", "node1.2", "root2"], "Expect get_nodes -> 3 nodes")

        //get_nodes
        nodes = table.tt("get_nodes", "node1.3")
        testing_tools.assert_list_equal_unordered(get_row_ids(nodes), ["node1.3"], "Expect get_nodes -> 1 nodes")
    })

    it("Collapse behavior", function () {
        // We want to make sure that collapsing a node that has expanded children does not collapse them
        // so they stay visible when the node is expanded again
        table.tt("expand_all")
        let nodes = table.tt("get_visible_nodes")
        assert.equal(nodes.length, 16)

        table.tt("collapse_node", "root1")
        nodes = table.tt("get_visible_nodes")
        assert.equal(nodes.length, 9)

        table.tt("expand_node", "root1")
        nodes = table.tt("get_visible_nodes")
        assert.equal(nodes.length, 16)
    })

    it("Loading", function () {
        assert.notEqual(tbody.find("tr").length, 16)
        table.tt("load_all")
        assert.equal(tbody.find("tr").length, 16)
    })

    it("Delete node", function () {
        let change_event_count = 0

        table.on("stt.size-changed", function () {
            change_event_count++
        })

        table.tt("load_all")
        change_event_count = 0
        assert.equal(table.tt("get_nodes", "node2.3.2").length, 1, "Node 2.3.2 exists")
        table.tt("delete_node", "node2.3.2")
        let children = table.tt("get_children", "node2.3")
        testing_tools.assert_list_equal_unordered(get_row_ids(children), ["node2.3.1", "node2.3.3"], "Children deleted")
        assert.equal(tbody.find("tr").length, 15, "Total number of row is reduced by 1")
        assert.equal(change_event_count, 1, "Size changed event triggered")

        assert.equal(table.tt("get_node_nesting_level", "node2.3"), 1, "Nesting level of node2.3 is unchanged")
        assert.equal(table.tt("get_node_nesting_level", "node2.3.1"), 2, "Nesting level of node2.3.1 is unchanged")
        assert.equal(table.tt("get_node_nesting_level", "node2.3.3"), 2, "Nesting level of node2.3.3 is unchanged")

        assert.throws(function () {
            table.tt("get_nodes", "node2.3.2")
        }, "Node 2.3.2 correctly deleted")

        change_event_count = 0
        table.tt("delete_node", "root1")
        assert.equal(tbody.find("tr").length, 7, "Whole tree under root1 is deleted") // 16 - 1 - 8

        assert.throws(function () {
            table.tt("get_nodes", "node1.2")
        }, "All root1 descendant are deleted")

        assert.equal(change_event_count, 1, "Single event for a whole tree deleted")
    })

    it("Add node", function () {
        table.tt("load_all")

        let row = dom_testing_tools.make_row_from_content(["this", "is", "a new row"])
        table.tt("add_node", "newNode1", row, "node2.3")

        const children = table.tt("get_children", "node2.3")
        testing_tools.assert_list_equal_unordered(
            get_row_ids(children),
            ["node2.3.1", "node2.3.2", "node2.3.3", "newNode1"],
            "newNode child of 2.3"
        )
        let parent = table.tt("get_parent", "newNode1")
        assert.equal(parent.length, 1, "Parent found")
        assert.equal(parent.is(table.tt("get_nodes", "node2.3")), true, "Parent is Node2.3")
        assert.equal(table.tt("get_node_nesting_level", "newNode1"), 2, "Nesting level of new node")
    })

    it("Add node - not allowed", function () {
        table.tt("load_all")

        let row = dom_testing_tools.make_row_from_content(["this", "is", "a new row"])

        assert.throws(function () {
            table.tt("add_node", "newNode1", row, "node2.2")
        }, "Node node2.2 should not accept children")
    })

    it("Move node - No parent & no insert point", function () {
        table.tt("load_all")
        table.tt("move_node", "node2.3.3") // Should make it root node, at the beginning
        post_move_check(table, {
            moved_node_id: "node2.3.3",
            previous_parent_id: "node2.3",
            new_parent_id: null,
            immediate_before_id: "root1",
        })
    })

    it("Move node - No parent & insert point", function () {
        table.tt("load_all")
        table.tt("move_node", "node2.3.3", null, "root1") // Should be between root1 and root2
        post_move_check(table, {
            moved_node_id: "node2.3.3",
            previous_parent_id: "node2.3",
            new_parent_id: null,
            before_id: "root2",
            after_id: "root1",
            immediate_after_id: "node1.4",
            immediate_before_id: "root2",
        })
    })

    it("Move node - With parent & no insert point", function () {
        table.tt("load_all")
        table.tt("move_node", "node2.3.2", "node1.3")
        post_move_check(table, {
            moved_node_id: "node2.3.2",
            previous_parent_id: "node2.3",
            new_parent_id: "node1.3",
            immediate_before_id: "node1.3.1",
            immediate_after_id: "node1.3",
        })
    })

    it("Move node - With parent & with insert point", function () {
        table.tt("load_all")
        table.tt("move_node", "node2.3.2", "node1.3", "node1.3.2")
        post_move_check(table, {
            moved_node_id: "node2.3.2",
            previous_parent_id: "node2.3",
            new_parent_id: "node1.3",
            immediate_before_id: "node1.3.3",
            immediate_after_id: "node1.3.2",
        })
    })

    it("Move node - not allowed", function () {
        table.tt("load_all")
        assert.throws(function () {
            table.tt("move_node", "node2.3.2", "node2.2") // node2.2 does not accepts children
        })
    })

    it("Move node - complex pattern", function () {
        table.tt("load_all")
        table.tt("move_node", "root2", "root1", "node1.4")
        table.tt("move_node", "node2.3", "node1.2")
        table.tt("move_node", "node1.1", "node2.3", "node2.3.2")
        table.tt("move_node", "node1.2", "root1", "node1.3")

        let expected_struct: RootNode = {
            root1: {
                cells: ["aaa", "bbb", "ccc"],
                children: {
                    "node1.3": {
                        cells: ["jjj", "kkk", "lll"],
                        children: {
                            "node1.3.1": { cells: ["mmm", "nnn", "ooo"] },
                            "node1.3.2": { cells: ["ppp", "qqq", "rrr"] },
                            "node1.3.3": { cells: ["sss", "ttt", "uuu"] },
                        },
                    },
                    "node1.2": {
                        cells: ["ggg", "hhh", "iii"],
                        children: {
                            "node2.3": {
                                cells: ["jjj2", "kkk2", "lll2"],
                                children: {
                                    "node2.3.1": { cells: ["mmm2", "nnn2", "ooo2"] },
                                    "node2.3.2": { cells: ["ppp2", "qqq2", "rrr2"] },
                                    "node1.1": { cells: ["ddd", "eee", "fff"] },
                                    "node2.3.3": { cells: ["sss2", "ttt2", "uuu2"] },
                                },
                            },
                        },
                    },
                    "node1.4": { cells: ["vvv", "www", "yyy"] },
                    root2: {
                        cells: ["aaa2", "bbb2", "ccc2"],
                        children: {
                            "node2.1": { cells: ["ddd2", "eee2", "fff2"] },
                            "node2.2": { cells: ["ggg2", "hhh2", "iii2"] },
                            "node2.4": { cells: ["vvv2", "www2", "yyy2"] },
                        },
                    },
                },
            },
        }

        let reference_table = dom_testing_tools.make_table("reference_table", 3) as JQueryScrutinyTable
        reference_table.tt({
            load_fn: get_load_fn(expected_struct),
        })

        // add_root_node
        let root_node_names = Object.keys(expected_struct)
        root_node_names.forEach(function (name) {
            reference_table.tt("add_root_node", name, dom_testing_tools.make_row_from_content(expected_struct[name].cells))
        })
        table.tt("expand_all")
        reference_table.tt("expand_all")

        const candidate_tr = table.find("tbody").find("tr") as JQueryRow
        const reference_tr = reference_table.find("tbody").find("tr") as JQueryRow

        assert.equal(candidate_tr.length, reference_tr.length)

        for (let i = 0; i < reference_tr.length; i++) {
            assert.equal(
                $(reference_tr[i]).attr(ATTR_ID),
                $(candidate_tr[i]).attr(ATTR_ID),
                `ATTR_ID does not match reference for row #${i}`
            )
            assert.equal(
                $(reference_tr[i]).attr(ATTR_PARENT),
                $(candidate_tr[i]).attr(ATTR_PARENT),
                `ATTR_PARENT does not match reference for row #${i}`
            )
            assert.equal(
                $(reference_tr[i]).attr(ATTR_LEVEL),
                $(candidate_tr[i]).attr(ATTR_LEVEL),
                `ATTR_LEVEL does not match reference for row #${i}`
            )
        }
    })
})

/*

transfer_node_from
transfer_node_to
no_children


OK - move_node
OK - add_node
OK - delete_node
OK - get_node_nesting_level
OK - load_all
OK - get_nodes
OK - get_parent
OK - get_children
OK - get_children_count
OK - get_root_node_of
OK - add_root_node
OK - is_root
OK - expand_node
OK - expand_all
OK - collapse_node
OK - collapse_all
OK - get_root_nodes
OK - get_visible_nodes

*/
