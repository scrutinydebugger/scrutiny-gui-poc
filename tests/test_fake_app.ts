//    test_fake_app.js
//        Unit tests for the FakeApp class that stubs the application
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { FakeApp } from "./fake_app"
import * as assert from "assert"

describe("FakeApp", function () {
    it("Basic event stubs", function () {
        // let's just make sure we can trigger event and get our callback called.
        let app = new FakeApp()
        app.trigger_event("event1")
        app.trigger_event("event1")
        app.trigger_event("event1")
        assert.equal(app.count_event("event1"), 3)

        let v = 0
        app.on_event("event2", function (data: any) {
            v++
            assert.equal(data.x, 1234)
        })

        assert.equal(v, 0)
        app.trigger_event("event2", { x: 1234 })
        app.process_events()
        assert.equal(v, 1)
    })
})
