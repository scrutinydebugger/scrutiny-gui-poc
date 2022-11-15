//    testing_tools.js
//        Some global tools for testing framework
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import * as assert from "assert"

export function assert_list_equal_unordered(list1: any[], list2: any[], msg?: string) {
    assert.equal(list1.length, list2.length)

    for (let i = 0; i < list1.length; i++) {
        assert.equal(true, list2.includes(list1[i]), msg)
    }
}
