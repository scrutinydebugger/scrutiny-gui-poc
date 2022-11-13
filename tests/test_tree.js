import {Tree} from "#appjs/tree.ts"
import {default as assert} from 'assert'
import {assert_list_equal_unordered} from "./testing_tools.js"

describe('Tree', function () {
    it('Basic tree access', function () {
      let tree = new Tree()
      let obj1 = {'A':123}
      let obj2 = {'B':222}
      tree.add("/a/b/c", obj1)
      tree.add("/a/b/d/x", obj2)
      assert.equal(obj1, tree.get_obj('/a/b/c'))
      assert.equal(obj2, tree.get_obj('/a/b/d/x'))

      assert.equal(tree.count(), 2)
      assert_list_equal_unordered(tree.get_all_paths(), ['/a/b/c', '/a/b/d/x'])
      assert_list_equal_unordered(tree.get_all_obj(), [obj1, obj2])


    });
});
