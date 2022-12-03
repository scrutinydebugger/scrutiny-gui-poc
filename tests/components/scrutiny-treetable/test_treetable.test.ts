//    test_treetable.test.ts
//        Test suite for the tree table plugin
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

require("source-map-support").install({ handleUncaughtExceptions: false })

import {
    scrutiny_treetable,
    PluginOptions as TreeTableOptions,
    TransferFunctionMetadata,
    TransferPolicy,
    TransferScope,
    TransferResult,
    ATTR_ID,
    ATTR_PARENT,
    ATTR_LEVEL,
} from "@scrutiny-treetable"
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

    const table_struct: RootNode = {
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

    function init_table_with_options(extra_options?: Partial<TreeTableOptions>) {
        const table_id = "my_treetable"
        table = dom_testing_tools.make_table(table_id, 3) as JQueryScrutinyTable
        tbody = table.find("tbody")

        const options: TreeTableOptions = {
            load_fn: get_load_fn(table_struct, ["node2.2", "node2.3.3"]),
        }

        $.extend(options, extra_options)

        table.tt(options)

        // add_root_node
        let root_node_names = Object.keys(table_struct)
        root_node_names.forEach(function (name) {
            table.tt("add_root_node", name, dom_testing_tools.make_row_from_content(table_struct[name].cells))
        })
    }

    before(() => {
        $.extend($.fn, { tt: scrutiny_treetable })
    })

    beforeEach(() => {
        body.html("") // Clear body

        init_table_with_options()
    })

    describe("Basic usage", function () {
        it("check_load_fn", function () {
            const loader = get_load_fn(table_struct)
            let rows = loader("root1", $("<tr />"))
            assert.equal(rows.length, 4)
            let children_list: string[] = []
            rows.forEach(function (node) {
                assert.notEqual(typeof node.id, "undefined")
                children_list.push(node.id as string)
            })
            testing_tools.assert_list_equal_unordered(
                children_list,
                ["node1.1", "node1.2", "node1.3", "node1.4"],
                "Check children of root1"
            )

            rows = loader("node2.3", $("<tr />"))
            assert.equal(rows.length, 3)
            children_list = []
            rows.forEach(function (node) {
                assert.notEqual(typeof node.id, "undefined")
                children_list.push(node.id as string)
            })
            testing_tools.assert_list_equal_unordered(children_list, ["node2.3.1", "node2.3.2", "node2.3.3"], "Check children of node2.3")
        })

        it("Loading", function () {
            assert.notEqual(tbody.find("tr").length, 16)
            table.tt("load_all")
            assert.equal(tbody.find("tr").length, 16)
        })

        it("Only root visible after creation", function () {
            let visible_rows = table.tt("get_visible_nodes") as JQueryRow
            assert.equal(visible_rows.length, 2, "Expect root node count")
        })

        it("Nesting", function () {
            table.tt("load_all")
            assert.equal(table.tt("get_node_nesting_level", "root1"), 0)
            assert.equal(table.tt("get_node_nesting_level", "node1.1"), 1)
            assert.equal(table.tt("get_node_nesting_level", "node1.2"), 1)
            assert.equal(table.tt("get_node_nesting_level", "node1.3.1"), 2)
            assert.equal(table.tt("get_node_nesting_level", "node1.3.2"), 2)
        })

        it("Expand/Collapse", function () {
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

            let visible_rows = table.tt("get_visible_nodes") as JQueryRow
            assert.equal(visible_rows.length, 6, "Expect root node count after expand")

            testing_tools.assert_list_equal_unordered(
                get_row_ids(visible_rows),
                ["root1", "root2", "node1.1", "node1.2", "node1.3", "node1.4"],
                "visible row after expand"
            )

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
        })

        it("Expand/Collpase all", function () {
            let expand_event_count = 0
            let collapse_event_count = 0

            table.on("stt.collapsed", function () {
                collapse_event_count++
            })

            table.on("stt.expanded", function () {
                expand_event_count++
            })

            table.tt("expand_all")
            assert.equal(expand_event_count, 4, "Number of event triggered")
            let visible_rows = table.tt("get_visible_nodes") as JQueryRow
            testing_tools.assert_list_equal_unordered(
                get_row_ids(visible_rows),
                get_row_ids(tbody.find("tr")),
                "Visible rows after expand all"
            )

            // collapse_all
            table.tt("collapse_all")
            assert.equal(collapse_event_count, 4, "Collapse all number of even triggered")
            visible_rows = table.tt("get_visible_nodes") as JQueryRow
            testing_tools.assert_list_equal_unordered(get_row_ids(visible_rows), ["root1", "root2"], "Visible rows after collapse all")
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

        it("Root nodes", function () {
            table.tt("load_all")
            assert.equal(table.tt("is_root", "root1"), true, "Expect root1 to be marked as root ")
            assert.equal(table.tt("is_root", "root2"), true, "Expect root2 to be marked as root ")
            assert.equal(table.tt("is_root", "node1.2"), false, "Expect node1.2 to be marked as non-root ")
            assert.equal(table.tt("is_root", "node1.3.1"), false, "Expect node1.3.1 to be marked as non-root ")

            let root_nodes = table.tt("get_root_nodes")
            assert.equal(root_nodes.length, 2, "Expect 2 root nodes")
            testing_tools.assert_list_equal_unordered(get_row_ids(root_nodes), ["root1", "root2"], "Expect root nodes list")

            // get_root_node_of
            let root = table.tt("get_root_node_of", "node1.3.2")
            testing_tools.assert_list_equal_unordered(get_row_ids(root), ["root1"], "Expect root of ndoe1.3.2 to be root1")
        })

        it("Children/Parent logic", function () {
            // get_children_count
            table.tt("load_all")
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
    })

    describe("Node manipulation", function () {
        it("Delete node", function () {
            let deleted_callback_count = 0
            let deleted_rows: string[] = []
            init_table_with_options({
                pre_delete_callback: function (tr: JQueryRow) {
                    deleted_callback_count++
                    deleted_rows.push(tr.attr("stt-id") as string)
                },
            })

            let change_event_count = 0

            table.on("stt.size-changed", function () {
                change_event_count++
            })

            table.tt("load_all")
            change_event_count = 0
            assert.equal(table.tt("get_nodes", "node2.3.2").length, 1, "Node 2.3.2 exists")
            table.tt("delete_node", "node2.3.2")
            testing_tools.assert_list_equal_unordered(deleted_rows, ["node2.3.2"])

            let children = table.tt("get_children", "node2.3")
            testing_tools.assert_list_equal_unordered(get_row_ids(children), ["node2.3.1", "node2.3.3"], "Children deleted")
            assert.equal(tbody.find("tr").length, 15, "Total number of row is reduced by 1")
            assert.equal(change_event_count, 1, "Size changed event triggered")
            assert.equal(deleted_callback_count, 1, "Deleted event triggered 1x")

            assert.equal(table.tt("get_node_nesting_level", "node2.3"), 1, "Nesting level of node2.3 is unchanged")
            assert.equal(table.tt("get_node_nesting_level", "node2.3.1"), 2, "Nesting level of node2.3.1 is unchanged")
            assert.equal(table.tt("get_node_nesting_level", "node2.3.3"), 2, "Nesting level of node2.3.3 is unchanged")

            assert.throws(function () {
                table.tt("get_nodes", "node2.3.2")
            }, "Node 2.3.2 correctly deleted")

            change_event_count = 0
            deleted_callback_count = 0
            deleted_rows = []
            table.tt("delete_node", "root1")
            assert.equal(tbody.find("tr").length, 7, "Whole tree under root1 is deleted") // 16 - 1 - 8

            assert.equal(deleted_callback_count, 8, "Deleted event triggered 8x")
            testing_tools.assert_list_equal_unordered(deleted_rows, [
                "root1",
                "node1.1",
                "node1.2",
                "node1.3",
                "node1.4",
                "node1.3.1",
                "node1.3.2",
                "node1.3.3",
            ])

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
    })

    describe("Move Node", function () {
        it("No parent & no insert point", function () {
            table.tt("load_all")
            table.tt("move_node", "node2.3.3") // Should make it root node, at the beginning
            post_move_check(table, {
                moved_node_id: "node2.3.3",
                previous_parent_id: "node2.3",
                new_parent_id: null,
                immediate_before_id: "root1",
            })
        })

        it("No parent & insert point", function () {
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

        it("With parent & no insert point", function () {
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

        it("With parent & with insert point", function () {
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

        it("Not allowed node", function () {
            table.tt("load_all")
            assert.throws(function () {
                table.tt("move_node", "node2.3.2", "node2.2") // node2.2 does not accepts children
            })
        })

        it("Never allowed", function () {
            init_table_with_options({
                move_allowed: false,
            })

            table.tt("load_all")
            assert.throws(function () {
                table.tt("move_node", "node2.3.2", "root1") // Root1 accepts children normally.
            })
        })

        it("Complex pattern", function () {
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
                    `Attribute ${ATTR_ID} does not match reference for row #${i}`
                )
                assert.equal(
                    $(reference_tr[i]).attr(ATTR_PARENT),
                    $(candidate_tr[i]).attr(ATTR_PARENT),
                    `Attribute ${ATTR_PARENT} does not match reference for row #${i}`
                )
                assert.equal(
                    $(reference_tr[i]).attr(ATTR_LEVEL),
                    $(candidate_tr[i]).attr(ATTR_LEVEL),
                    `Attribute ${ATTR_LEVEL} does not match reference for row #${i}`
                )
            }
        })
    })

    describe("Transfer rows to other tables", function () {
        let table2: JQueryScrutinyTable
        let tbody2: JQuery<HTMLTableSectionElement>

        const table2_struct: RootNode = {
            t2root1: {
                cells: ["aaa", "bbb", "ccc", "ddd"],
                children: {
                    "t2node1.1": {
                        cells: ["eee", "fff", "ggg", "hhh"],
                    },
                    "t2node1.2": {
                        cells: ["iii", "jjj", "kkk", "lll"],
                    },
                },
            },
            t2root2: {
                cells: ["AAA", "BBB", "CCC", "DDD"],
                children: {
                    "t2node2.1": {
                        cells: ["EEE", "FFF", "GGG", "HHH"],
                    },
                    "t2node2.2": {
                        cells: ["III", "JJJ", "KKK", "LLL"],
                    },
                },
            },
        }

        function init_table2_with_options(extra_options?: Partial<TreeTableOptions>) {
            const table_id = "table2"
            table2 = dom_testing_tools.make_table(table_id, 4) as JQueryScrutinyTable
            tbody2 = table2.find("tbody")

            const options: TreeTableOptions = {
                load_fn: get_load_fn(table2_struct),
            }

            $.extend(options, extra_options)
            table2.tt(options)

            // add_root_node
            let root_node_names = Object.keys(table2_struct)
            root_node_names.forEach(function (name) {
                table2.tt("add_root_node", name, dom_testing_tools.make_row_from_content(table2_struct[name].cells))
            })
        }

        beforeEach(function () {
            init_table2_with_options()
        })

        it("Transfer logic", function () {
            var data_for_transfer_fn = {
                expected_original_id: "",
                expected_original_parent_id: "",
                expected_row_content: [] as string[],
                node_id_to_use: "",
            }

            init_table2_with_options({
                transfer_fn: function (source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata) {
                    dom_testing_tools.assert_same(source_table, table, "In transfer function, source table does not match")
                    assert.equal(
                        meta.original_id,
                        data_for_transfer_fn.expected_original_id,
                        "In transfer function, original_id does not match"
                    )
                    assert.equal(
                        meta.original_parent_id,
                        data_for_transfer_fn.expected_original_parent_id,
                        "In transfer function, original_parent_id does not match"
                    )
                    const tr = dom_testing_tools.make_row_from_content(["prefixA-", "prefixB-", "prefixC-", "prefixD-"])

                    tr.find("td:nth-child(1)").append(bare_line.find("td:nth-child(3)").text())
                    tr.find("td:nth-child(2)").append(bare_line.find("td:nth-child(2)").text())
                    tr.find("td:nth-child(3)").append(bare_line.find("td:nth-child(1)").text())

                    return {
                        id: data_for_transfer_fn.node_id_to_use,
                        tr: tr,
                    }
                },
                transfer_policy_fn: function () {
                    const policy: TransferPolicy = {
                        scope: TransferScope.ROW_ONLY,
                    }
                    return policy
                },
            })

            table.tt("load_all")
            table2.tt("load_all")

            data_for_transfer_fn.expected_original_id = "node1.3.2"
            data_for_transfer_fn.expected_original_parent_id = "node1.3"
            data_for_transfer_fn.node_id_to_use = "HELLO"
            data_for_transfer_fn.expected_row_content = ["ppp", "qqq", "rrr"]
            table.tt("transfer_node_to", table2, "node1.3.2", "t2node2.1")
            dom_testing_tools.assert_same(table2.tt("get_parent", "HELLO"), table2.tt("get_nodes", "t2node2.1"))
            const transfered_row = table2.tt("get_nodes", "HELLO")
            assert.equal(transfered_row.find("td").length, 4)
            assert.equal(transfered_row.find("td:nth-child(1)").text(), "prefixA-rrr")
            assert.equal(transfered_row.find("td:nth-child(2)").text(), "prefixB-qqq")
            assert.equal(transfered_row.find("td:nth-child(3)").text(), "prefixC-ppp")
            assert.equal(transfered_row.find("td:nth-child(4)").text(), "prefixD-")
        })

        it("Transfer Policy - Single Row", function () {
            init_table2_with_options({
                transfer_fn: function (source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata) {
                    return {
                        id: "newId",
                        tr: dom_testing_tools.make_row_from_content(["aaa", "bbb", "ccc", "ddd"]),
                    }
                },
                transfer_policy_fn: function () {
                    return {
                        scope: TransferScope.ROW_ONLY,
                    } as TransferPolicy
                },
            })

            table.tt("load_all")
            table.tt("expand_all")
            table2.tt("load_all")
            table2.tt("expand_all")

            // Move root2 under t2root2 after t2node2.1
            const nb_row_before = tbody2.find("tr").length
            const transfer_result = table2.tt("transfer_node_from", table, "root2", "t2root2", "t2node2.1") as TransferResult
            assert.notEqual(transfer_result, null)
            assert.equal(transfer_result.dest_rows.length, 1)
            assert.equal(transfer_result.source_rows.length, 1)
            assert.deepEqual(transfer_result.id_map, { root2: "newId" })
            dom_testing_tools.assert_same(transfer_result.source_rows, table.tt("get_nodes", "root2"))
            dom_testing_tools.assert_same(transfer_result.dest_rows, table2.tt("get_nodes", "newId"))

            assert.equal(tbody2.find("tr").length, nb_row_before + 1, "Expect a single row to be added")
            const moved_row = table2.tt("get_nodes", "newId")

            dom_testing_tools.assert_is_immediate_after(moved_row, table2.tt("get_nodes", "t2node2.1"), "New row after t2node2.1")
            dom_testing_tools.assert_is_immediate_before(moved_row, table2.tt("get_nodes", "t2node2.2"), "New row before t2node2.2")
        })

        it("Transfer Policy - Visible Row", function () {
            init_table2_with_options({
                transfer_fn: function (source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata) {
                    return {
                        tr: dom_testing_tools.make_row_from_content(["aaa", "bbb", "ccc", "ddd"]),
                    }
                },
                transfer_policy_fn: function () {
                    return {
                        scope: TransferScope.VISIBLE_ONLY,
                    } as TransferPolicy
                },
            })

            table.tt("load_all")
            table2.tt("load_all")

            table.tt("expand_node", "root2") // Will make immediate children visible, but not subchildren

            // Move root2 under t2root2 after t2node2.1
            const nb_row_before = tbody2.find("tr").length
            const transfer_result = table2.tt("transfer_node_from", table, "root2", "t2root2", "t2node2.1") as TransferResult
            assert.notEqual(transfer_result, null)
            assert.equal(tbody2.find("tr").length, nb_row_before + 5, "Expect 5 new rows to be added")
            const id_map = transfer_result.id_map
            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["root2"]),
                table2.tt("get_nodes", "t2node2.1"),
                "Root2 after t2node2.1"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.1"]),
                table2.tt("get_nodes", id_map["root2"]),
                "Node2.1 after root2"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.2"]),
                table2.tt("get_nodes", id_map["node2.1"]),
                "Node2.2 after Node2.1"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.3"]),
                table2.tt("get_nodes", id_map["node2.2"]),
                "Node2.3 after Node2.2"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.4"]),
                table2.tt("get_nodes", id_map["node2.3"]),
                "Node2.4 after Node2.3"
            )

            dom_testing_tools.assert_is_immediate_before(
                table2.tt("get_nodes", id_map["node2.4"]),
                table2.tt("get_nodes", "t2node2.2"),
                "Node2.4 before t2node2.2"
            )

            dom_testing_tools.assert_same(
                table2.tt("get_parent", id_map["root2"]),
                table2.tt("get_nodes", "t2root2"),
                "root2 has correct parent"
            )
            testing_tools.assert_list_equal_unordered(
                get_row_ids(table2.tt("get_children", id_map["root2"])),
                [id_map["node2.1"], id_map["node2.2"], id_map["node2.3"], id_map["node2.4"]],
                "Children should be the same"
            )

            assert.equal(table2.tt("get_node_nesting_level", id_map["root2"]), 1)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.1"]), 2)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.2"]), 2)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.3"]), 2)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.4"]), 2)
        })

        it("Transfer Policy - All rows", function () {
            init_table2_with_options({
                transfer_fn: function (source_table: JQueryTable, bare_line: JQueryRow, meta: TransferFunctionMetadata) {
                    return {
                        tr: dom_testing_tools.make_row_from_content(["aaa", "bbb", "ccc", "ddd"]),
                    }
                },
                transfer_policy_fn: function () {
                    return {
                        scope: TransferScope.ALL,
                    } as TransferPolicy
                },
            })

            table2.tt("load_all")

            // Move root2 under t2root2 after t2node2.1
            const nb_row_before = tbody2.find("tr").length
            const transfer_result = table2.tt("transfer_node_from", table, "root2", "t2root2", "t2node2.1") as TransferResult
            assert.equal(tbody2.find("tr").length, nb_row_before + 8, "Expect 8 new rows to be added")
            const id_map = transfer_result.id_map
            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["root2"]),
                table2.tt("get_nodes", "t2node2.1"),
                "Root2 after t2node2.1"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.1"]),
                table2.tt("get_nodes", id_map["root2"]),
                "Node2.1 after root2"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.2"]),
                table2.tt("get_nodes", id_map["node2.1"]),
                "Node2.2 after Node2.1"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.3"]),
                table2.tt("get_nodes", id_map["node2.2"]),
                "Node2.3 after Node2.2"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.3.1"]),
                table2.tt("get_nodes", id_map["node2.3"]),
                "Node2.3.1 after Node2.3"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.3.2"]),
                table2.tt("get_nodes", id_map["node2.3.1"]),
                "Node2.3.2 after Node2.3.1"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.3.3"]),
                table2.tt("get_nodes", id_map["node2.3.2"]),
                "Node2.3.3 after Node2.3.2"
            )

            dom_testing_tools.assert_is_immediate_after(
                table2.tt("get_nodes", id_map["node2.4"]),
                table2.tt("get_nodes", id_map["node2.3.3"]),
                "Node2.4 after Node2.3.3"
            )

            dom_testing_tools.assert_is_immediate_before(
                table2.tt("get_nodes", id_map["node2.4"]),
                table2.tt("get_nodes", "t2node2.2"),
                "Node2.4 before t2node2.2"
            )

            dom_testing_tools.assert_same(table2.tt("get_parent", id_map["root2"]), table2.tt("get_nodes", "t2root2"))

            testing_tools.assert_list_equal_unordered(get_row_ids(table2.tt("get_children", id_map["root2"])), [
                id_map["node2.1"],
                id_map["node2.2"],
                id_map["node2.3"],
                id_map["node2.4"],
            ])

            testing_tools.assert_list_equal_unordered(get_row_ids(table2.tt("get_children", id_map["node2.3"])), [
                id_map["node2.3.1"],
                id_map["node2.3.2"],
                id_map["node2.3.3"],
            ])

            assert.equal(table2.tt("get_node_nesting_level", id_map["root2"]), 1)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.1"]), 2)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.2"]), 2)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.3"]), 2)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.3.1"]), 3)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.3.2"]), 3)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.3.3"]), 3)
            assert.equal(table2.tt("get_node_nesting_level", id_map["node2.4"]), 2)
        })
    })
})
