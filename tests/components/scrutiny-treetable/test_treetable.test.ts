//    test_treetable.test.ts
//        Test suite for the tree table plugin
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { scrutiny_treetable, PluginOptions as TreeTableOptions } from "@scrutiny-treetable"
import { default as $ } from "@jquery"
import * as dom_testing_tools from "@tests/dom_testing_tools"
import * as assert from "assert"
import { get_load_fn, RootNode } from "./test_treetable_tools"
import * as testing_tools from "@tests/testing_tools"

type JQueryRow = JQuery<HTMLTableRowElement>
interface JQueryScrutinyTable extends JQuery<HTMLTableElement> {
    scrutiny_treetable: Function
}

$.extend($.fn, { scrutiny_treetable })

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
        output.push($(this).attr("stt-id"))
    })

    return output
}

describe("scrutiny-treetable", function () {
    let body = $("body") as JQuery<HTMLBodyElement>
    let table: JQueryScrutinyTable
    let tbody: JQuery<HTMLTableSectionElement>

    before(() => {
        $.extend($.fn, { scrutiny_treetable })
    })

    beforeEach(() => {
        body.html("") // Clear body

        const table_id = "my_treetable"
        table = dom_testing_tools.make_table(table_id, 3) as JQueryScrutinyTable
        tbody = table.find("tbody")

        const options: TreeTableOptions = {
            load_fn: get_load_fn(table_struct),
        }

        table.scrutiny_treetable(options)

        // add_root_node
        let root_node_names = Object.keys(table_struct)
        root_node_names.forEach(function (name) {
            table.scrutiny_treetable("add_root_node", name, dom_testing_tools.make_row_from_content(table_struct[name].cells))
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
        let visible_rows = table.scrutiny_treetable("get_visible_nodes") as JQueryRow
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
        table.scrutiny_treetable("expand_node", "root1")
        assert.equal(expand_event_count, 1)
        assert.equal(collapse_event_count, 0)

        // Nesting
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "root1"), 0)
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node1.1"), 1)
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node1.2"), 1)
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node1.3.1"), 2)
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node1.3.2"), 2)

        // get_visible_nodes
        visible_rows = table.scrutiny_treetable("get_visible_nodes") as JQueryRow
        assert.equal(visible_rows.length, 6, "Expect root node count after expand")

        testing_tools.assert_list_equal_unordered(
            get_row_ids(visible_rows),
            ["root1", "root2", "node1.1", "node1.2", "node1.3", "node1.4"],
            "visible row after expand"
        )

        // collapse_node
        table.scrutiny_treetable("collapse_node", "root1")
        assert.equal(expand_event_count, 1)
        assert.equal(collapse_event_count, 1)

        // get_visible_nodes
        visible_rows = table.scrutiny_treetable("get_visible_nodes") as JQueryRow
        assert.equal(visible_rows.length, 2, "Expect root node count after collpase")

        testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), ["root1", "root2"], "Visible rows after collapse")

        expand_event_count = 0
        collapse_event_count = 0
        // expand_all
        table.scrutiny_treetable("expand_all")
        assert.equal(expand_event_count, 4, "Expand all number of even triggered")
        visible_rows = table.scrutiny_treetable("get_visible_nodes") as JQueryRow
        testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), get_row_ids(tbody.find("tr")), "Visible rows after expand all")

        // collapse_all
        table.scrutiny_treetable("collapse_all")
        assert.equal(collapse_event_count, 4, "Collapse all number of even triggered")
        visible_rows = table.scrutiny_treetable("get_visible_nodes") as JQueryRow
        testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), ["root1", "root2"], "Visible rows after collapse all")

        // is_root
        assert.equal(table.scrutiny_treetable("is_root", "root1"), true, "Expect root1 to be marked as root ")
        assert.equal(table.scrutiny_treetable("is_root", "root2"), true, "Expect root2 to be marked as root ")
        assert.equal(table.scrutiny_treetable("is_root", "node1.2"), false, "Expect node1.2 to be marked as non-root ")
        assert.equal(table.scrutiny_treetable("is_root", "node1.3.1"), false, "Expect node1.3.1 to be marked as non-root ")

        // get_root_nodes
        let root_nodes = table.scrutiny_treetable("get_root_nodes")
        assert.equal(root_nodes.length, 2, "Expect 2 root nodes")
        testing_tools.assert_list_equal_unordered(get_row_ids(root_nodes), ["root1", "root2"], "Expect root nodes list")

        // get_root_node_of
        let root = table.scrutiny_treetable("get_root_node_of", "node1.3.2")
        testing_tools.assert_list_equal_unordered(get_row_ids(root), ["root1"], "Expect root of ndoe1.3.2 to be root1")

        // get_children_count
        assert.equal(table.scrutiny_treetable("get_children_count", "node2.3"), 3, "Expect children count of node2.3 ")
        assert.equal(table.scrutiny_treetable("get_children_count", "root1"), 4, "Expect children count root1")
        assert.equal(table.scrutiny_treetable("get_children_count", "node1.3.1"), 0, "Expect children count node1.3.1")

        //get_children
        let root2_children = table.scrutiny_treetable("get_children", "root2")
        testing_tools.assert_list_equal_unordered(
            get_row_ids(root2_children),
            ["node2.1", "node2.2", "node2.3", "node2.4"],
            "Expect children of root2"
        )

        //get_parent
        let parents = table.scrutiny_treetable("get_parent", "node2.3.1")
        testing_tools.assert_list_equal_unordered(get_row_ids(parents), ["node2.3"], "Expect parent of node2.3.1")

        //get_nodes
        let nodes = table.scrutiny_treetable("get_nodes", ["node2.3.1", "node1.2", "root2"])
        testing_tools.assert_list_equal_unordered(get_row_ids(nodes), ["node2.3.1", "node1.2", "root2"], "Expect get_nodes -> 3 nodes")

        //get_nodes
        nodes = table.scrutiny_treetable("get_nodes", "node1.3")
        testing_tools.assert_list_equal_unordered(get_row_ids(nodes), ["node1.3"], "Expect get_nodes -> 1 nodes")
    })

    it("Collapse behavior", function () {
        // We want to make sure that collapsing a node that has expanded children does not collapse them
        // so they stay visible when the node is expanded again
        table.scrutiny_treetable("expand_all")
        let nodes = table.scrutiny_treetable("get_visible_nodes")
        assert.equal(nodes.length, 16)

        table.scrutiny_treetable("collapse_node", "root1")
        nodes = table.scrutiny_treetable("get_visible_nodes")
        assert.equal(nodes.length, 9)

        table.scrutiny_treetable("expand_node", "root1")
        nodes = table.scrutiny_treetable("get_visible_nodes")
        assert.equal(nodes.length, 16)
    })

    it("Loading", function () {
        assert.notEqual(tbody.find("tr").length, 16)
        table.scrutiny_treetable("load_all")
        assert.equal(tbody.find("tr").length, 16)
    })

    it("Delete node", function () {
        let change_event_count = 0

        table.on("stt.size-changed", function () {
            change_event_count++
        })

        table.scrutiny_treetable("load_all")
        change_event_count = 0
        assert.equal(table.scrutiny_treetable("get_nodes", "node2.3.2").length, 1, "Node 2.3.2 exists")
        table.scrutiny_treetable("delete_node", "node2.3.2")
        let children = table.scrutiny_treetable("get_children", "node2.3")
        testing_tools.assert_list_equal_unordered(get_row_ids(children), ["node2.3.1", "node2.3.3"], "Children deleted")
        assert.equal(tbody.find("tr").length, 15, "Total number of row is reduced by 1")
        assert.equal(change_event_count, 1, "Size changed event triggered")

        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node2.3"), 1, "Nesting level of node2.3 is unchanged")
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node2.3.1"), 2, "Nesting level of node2.3.1 is unchanged")
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "node2.3.3"), 2, "Nesting level of node2.3.3 is unchanged")

        assert.throws(function () {
            table.scrutiny_treetable("get_nodes", "node2.3.2")
        }, "Node 2.3.2 correctly deleted")

        change_event_count = 0
        table.scrutiny_treetable("delete_node", "root1")
        assert.equal(tbody.find("tr").length, 7, "Whole tree under root1 is deleted") // 16 - 1 - 8

        assert.throws(function () {
            table.scrutiny_treetable("get_nodes", "node1.2")
        }, "All root1 descendant are deleted")

        assert.equal(change_event_count, 1, "Single event for a whole tree deleted")
    })

    it("Add node", function () {
        table.scrutiny_treetable("load_all")

        let row = dom_testing_tools.make_row_from_content(["this", "is", "a new row"])
        table.scrutiny_treetable("add_node", "newNode1", row, "node2.3")

        const children = table.scrutiny_treetable("get_children", "node2.3")
        testing_tools.assert_list_equal_unordered(
            get_row_ids(children),
            ["node2.3.1", "node2.3.2", "node2.3.3", "newNode1"],
            "newNode child of 2.3"
        )
        let parent = table.scrutiny_treetable("get_parent", "newNode1")
        assert.equal(parent.length, 1, "Parent found")
        assert.equal(parent.is(table.scrutiny_treetable("get_nodes", "node2.3")[0]), true, "Parent is Node2.3")
        assert.equal(table.scrutiny_treetable("get_node_nesting_level", "newNode1"), 2, "Nesting level of new node")
    })
})

/*

move_node
transfer_node_from
transfer_node_to
no_children


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
