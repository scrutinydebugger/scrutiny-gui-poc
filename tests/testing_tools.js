import {default as assert} from 'assert'

export function assert_list_equal_unordered(list1, list2, msg){
  assert.equal(list1.length, list2.length)
  
  for (let i=0; i<list1.length; i++){
    assert.equal(true, list2.includes(list1[i]))
  }
}