//    testing_tools.ts
//        Some global tools for testing framework
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

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

export function assert_in<T>(v: T, arr: T[], msg = "") {
    let found = false
    for (let i = 0; i < arr.length; i++) {
        if (v === arr[i]) {
            found = true
            break
        }
    }

    assert.equal(true, found, "Element not found in array. " + msg)
}

export function assert_not_in<T>(v: T, arr: T[], msg = "") {
    let found = false
    for (let i = 0; i < arr.length; i++) {
        if (v === arr[i]) {
            found = true
            break
        }
    }

    assert.equal(false, found, "Element found in array. " + msg)
}
