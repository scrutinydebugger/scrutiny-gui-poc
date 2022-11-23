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

describe("scrutiny-treetable", function () {
    var body = $("body") as JQuery<HTMLBodyElement>

    before(() => {
        $.extend($.fn, { scrutiny_treetable })
    })

    beforeEach(() => {
        body.html("") // Clear body
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
        testing_tools.assert_list_equal_unordered(children_list, ["node1.1", "node1.2", "node1.3", "node1.4"])

        rows = loader("node2.3", $("<tr />"))
        assert.equal(rows.length, 3)
        children_list = []
        rows.forEach(function (node) {
            assert.notEqual(typeof node.id, "undefined")
            children_list.push(node.id as string)
        })
        testing_tools.assert_list_equal_unordered(children_list, ["node2.3.1", "node2.3.2", "node2.3.3"])
    })

    it("init", function () {
        const table_id = "my_treetable"
        const table = dom_testing_tools.make_table(table_id, 3) as JQueryScrutinyTable

        const options: TreeTableOptions = {
            load_fn: get_load_fn(table_struct),
        }

        table.scrutiny_treetable(options)

        const root_nodes = Object.keys(table_struct)
        root_nodes.forEach(function (name) {
            table.scrutiny_treetable("add_root_node", name, dom_testing_tools.make_row_from_content(table_struct[name].cells))
        })

        const visible_rows = table.scrutiny_treetable("get_visible_rows")
        assert.equal(visible_rows.length, 2, "Expect root node count")
    })
})
