//    testing_tools.ts
//        Some global tools for testing framework
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import * as assert from "assert"

export function assert_list_equal_unordered(list1: any[], list2: any[], msg?: string) {
    if (typeof msg === "undefined") {
        msg = ""
    }
    assert.equal(list1.length, list2.length, "List length mismatch. " + msg)

    for (let i = 0; i < list1.length; i++) {
        assert.equal(true, list2.includes(list1[i]), `Item ${list1[i]} not in list. ${msg}`)
    }
}
