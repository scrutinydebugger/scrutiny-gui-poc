//    test_datastore.test.ts
//        Unit tests for the Datastore class
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { Datastore, DatastoreEntry, DatastoreEntryType } from "@src/datastore"
import { App } from "@src/app"
import { assert_list_equal_unordered } from "./testing_tools"
import * as assert from "assert"
import { FakeApp } from "./fake_app"

describe("DataStore", function () {
    it("Basic access", function () {
        let app = new FakeApp()
        let ds = new Datastore(app as unknown as App)
        let entry1 = new DatastoreEntry(DatastoreEntryType.Var, "aaa", "/a/b/c", "float32")
        let entry2 = new DatastoreEntry(DatastoreEntryType.Var, "bbb", "/a/b/d", "float32")
        let entry3 = new DatastoreEntry(DatastoreEntryType.Alias, "ccc", "/a/b/e", "sint16")

        ds.add(entry1)
        ds.add(entry2)
        ds.add(entry3)

        assert.equal(ds.get_entry(DatastoreEntryType.Var, "/a/b/c"), entry1)
        assert.equal(ds.get_entry(DatastoreEntryType.Var, "/a/b/d"), entry2)
        assert.equal(ds.get_entry(DatastoreEntryType.Alias, "/a/b/e"), entry3)
        assert.equal(ds.node_exist(DatastoreEntryType.Var, "/a/b/c"), true)
        assert.equal(ds.node_exist(DatastoreEntryType.Var, "/a/b/d"), true)
        assert.equal(ds.node_exist(DatastoreEntryType.Var, "/a/a/a"), false)
        assert.equal(ds.get_server_id(DatastoreEntryType.Var, "/a/b/c"), "aaa")
        assert.equal(ds.get_server_id(DatastoreEntryType.Var, "/a/b/d"), "bbb")
        assert.equal(ds.get_server_id(DatastoreEntryType.Alias, "/a/b/e"), "ccc")

        assert_list_equal_unordered(ds.all_display_path(DatastoreEntryType.Var), ["/a/b/c", "/a/b/d"])
        assert_list_equal_unordered(ds.get_entries(DatastoreEntryType.Var), [entry1, entry2])
        assert_list_equal_unordered(ds.get_entries(DatastoreEntryType.Alias), [entry3])
    })

    it("Value access and exception", function () {
        let app = new FakeApp()
        let ds = new Datastore(app as unknown as App)
        let entry1 = new DatastoreEntry(DatastoreEntryType.Var, "aaa", "/a/b/c", "float32")
        let entry2 = new DatastoreEntry(DatastoreEntryType.Var, "bbb", "/a/b/d", "float32")
        let entry3 = new DatastoreEntry(DatastoreEntryType.Alias, "ccc", "/a/b/e", "sint16")

        ds.add(entry1)
        ds.add(entry2)
        ds.add(entry3)

        assert.equal(ds.get_value(entry1.entry_type, entry1), null)
        assert.equal(ds.get_value(entry2.entry_type, entry2), null)
        assert.equal(ds.get_value(entry3.entry_type, entry3), null)

        ds.set_value(entry1.entry_type, entry1, 111)
        ds.set_value(entry2.entry_type, entry2, 222)
        ds.set_value(entry3.entry_type, entry3, 333)

        assert.equal(ds.get_value(DatastoreEntryType.Var, "/a/b/c"), 111)
        assert.equal(ds.get_value(DatastoreEntryType.Var, "/a/b/d"), 222)
        assert.equal(ds.get_value(DatastoreEntryType.Alias, "/a/b/e"), 333)

        ds.set_value(DatastoreEntryType.Var, "/a/b/c", 999)
        ds.set_value(DatastoreEntryType.Var, "/a/b/d", 888)
        ds.set_value(DatastoreEntryType.Alias, "/a/b/e", 777)

        assert.equal(ds.get_value(DatastoreEntryType.Var, entry1), 999)
        assert.equal(ds.get_value(DatastoreEntryType.Var, entry2), 888)
        assert.equal(ds.get_value(DatastoreEntryType.Alias, entry3), 777)

        let e = ds.get_entry_from_server_id("ccc")
        assert.equal(e.get_value(), 777)

        assert.throws(function () {
            ds.get_entry_from_server_id("xxx")
        })

        assert.throws(function () {
            ds.set_value(DatastoreEntryType.Var, "/x/y/z", 123)
        })

        assert.throws(function () {
            // @ts-ignore
            ds.set_value(DatastoreEntryType.Var, null, 123)
        })

        assert.throws(function () {
            // @ts-ignore
            ds.set_value(DatastoreEntryType.Var, undefined, 123)
        })

        assert.throws(function () {
            ds.get_value(DatastoreEntryType.Var, "/x/y/z")
        })

        assert.throws(function () {
            // @ts-ignore
            ds.get_value(DatastoreEntryType.Var, null)
        })

        assert.throws(function () {
            // @ts-ignore
            ds.get_value(DatastoreEntryType.Var, undefined)
        })
    })

    it("Watchers logic", function () {
        let app = new FakeApp()
        let ds = new Datastore(app as unknown as App)
        let entry1 = new DatastoreEntry(DatastoreEntryType.Var, "aaa", "/a/b/c", "float32")
        let entry2 = new DatastoreEntry(DatastoreEntryType.Var, "bbb", "/a/b/d", "float32")
        let entry3 = new DatastoreEntry(DatastoreEntryType.Alias, "ccc", "/a/b/e", "sint16")

        ds.add(entry1)
        ds.add(entry2)
        ds.add(entry3)

        let watcher1 = "aaa"
        let watcher2 = "bbb"

        let x = 0
        let y = 0
        let z = 0

        assert.equal(app.count_event("scrutiny.datastore.start_watching"), 0)

        ds.watch(DatastoreEntryType.Var, "/a/b/c", watcher1, function (value) {
            x = value
        })
        assert.equal(app.count_event("scrutiny.datastore.start_watching"), 1)
        assert_list_equal_unordered(ds.get_watched_entries(), [entry1])

        ds.watch(DatastoreEntryType.Var, "/a/b/c", watcher2, function (value) {
            y = value
        })
        assert.equal(app.count_event("scrutiny.datastore.start_watching"), 1) // Does not increase as this entry was watched by another watcher
        assert_list_equal_unordered(ds.get_watched_entries(), [entry1])

        ds.watch(entry3.entry_type, entry3, watcher1, function (value) {
            z = value
        })
        assert.equal(app.count_event("scrutiny.datastore.start_watching"), 2)
        assert_list_equal_unordered(ds.get_watched_entries(), [entry1, entry3])

        ds.set_value(DatastoreEntryType.Var, "/a/b/c", 123)
        ds.set_value(entry3.entry_type, entry3, 456)
        assert.equal(x, 123)
        assert.equal(y, 123)
        assert.equal(z, 456)

        ds.unwatch_all(watcher1)

        ds.set_value(DatastoreEntryType.Var, "/a/b/c", 888)
        ds.set_value(DatastoreEntryType.Alias, "/a/b/e", 999)

        assert.notEqual(x, 888)
        assert.equal(y, 888)
        assert.notEqual(z, 999)

        assert_list_equal_unordered(ds.get_watched_entries(), [entry1])
        ds.unwatch_all(watcher2)
        assert_list_equal_unordered(ds.get_watched_entries(), [])
    })
})
