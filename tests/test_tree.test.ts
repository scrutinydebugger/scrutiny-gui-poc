//    test_tree.test.ts
//        Unit tests for the Tree storage class
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { Tree } from "@src/tree"
import * as assert from "assert"
import { assert_list_equal_unordered } from "./testing_tools"

describe("Tree", function () {
    it("Basic tree access", function () {
        let tree = new Tree()
        let obj1 = { A: 123 }
        let obj2 = { B: 222 }
        tree.add("/a/b/c", obj1)
        tree.add("/a/b/d/x", obj2)
        assert.equal(obj1, tree.get_obj("/a/b/c"))
        assert.equal(obj2, tree.get_obj("/a/b/d/x"))

        assert.equal(tree.count(), 2)
        assert_list_equal_unordered(tree.get_all_paths(), ["/a/b/c", "/a/b/d/x"])
        assert_list_equal_unordered(tree.get_all_obj(), [obj1, obj2])
    })

    it("Path validation", function () {
        let tree = new Tree()
        let obj1 = { A: 123 }
        let obj2 = { B: 222 }
        tree.add("/a/b/c", obj1)
        tree.add("/a/b/d/x", obj2)

        assert.equal(tree.path_valid("/"), true, "/")
        assert.equal(tree.path_valid("/a"), true, "/a")
        assert.equal(tree.path_valid("/a/"), true, "/a/")
        assert.equal(tree.path_valid("/a/b"), true, "/a/b")
        assert.equal(tree.path_valid("/a/b/"), true, "/a/b/")
        assert.equal(tree.path_valid("/a/b/c"), true, "/a/b/c")
        assert.equal(tree.path_valid("/a/b/c/"), true, "/a/b/c/")
        assert.equal(tree.path_valid("/a/b/d"), true, "/a/b/d")
        assert.equal(tree.path_valid("/a/b/d/"), true, "/a/b/d/")
        assert.equal(tree.path_valid("/a/b/d/x"), true, "/a/b/d/x")
        assert.equal(tree.path_valid("/a/b/d/x/"), true, "/a/b/d/x/")
        assert.equal(tree.path_valid("/a/b/c/e"), false, "/a/b/c/e")
        assert.equal(tree.path_valid("/x"), false, "/x")
    })

    it("Path manipulation", function () {
        let tree = new Tree()
        assert.equal("a/b/c", tree.join_path("a", "b", "c"))
        assert.equal("/a/b/c", tree.join_path("/a//", "/b/", "/c/"))
    })
})
