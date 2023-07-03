//    tree.ts
//        A Tree structure that can store object associated with a path in the /aaa/bbb/ccc
//        format.
//        Allow log complexity when searching
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { trim, trim_end } from "./tools";

type ObjDict<ObjType> = Record<string, ObjType>;
interface ShallowSubtreeDict {
  [index: string]: {
    display_path: string;
    has_objects: boolean;
    has_subtrees: boolean;
  };
}

type SubtreeDict<ObjType> = Record<string, Node<ObjType>>;
interface Node<ObjType> {
  objects: ObjDict<ObjType>;
  subtrees: SubtreeDict<ObjType>;
}

export interface ShallowNodeDescription<ObjType> {
  objects: ObjDict<ObjType>;
  subtrees: ShallowSubtreeDict;
}

interface Segments {
  name: string | null;
  segments: string[];
}

/**
 * Store objects into a tree like structure where each position is identified by a path
 * of the form /aaa/bbb/ccc. Allows log complexity search
 */
export class Tree<ObjType> {
  datastruct: Node<ObjType>;
  nb_obj: number;
  __class__: any;

  constructor() {
    this.datastruct = {
      objects: {},
      subtrees: {},
    } as unknown as Node<ObjType>;
    this.nb_obj = 0;

    this.__class__ = Tree;
  }
  count() {
    return this.nb_obj;
  }

  /**
   * Parse a string in the format /aaa/bbb/ccc and returns all parts of the path
   * @param path The path the parse
   * @param has_name When true, the last segment is considered as the name and is provided in the "name" property. When false,
   * all segments are added to the segments output
   * @returns A the list of segments in the path
   */
  static get_segments(path: string, has_name: boolean = true): Segments {
    let output = {
      name: null,
      segments: [],
    } as Segments;
    let segments = trim(path, "/").split("/");
    let node_name: string | undefined = "";
    segments = segments.filter((s) => s !== "");

    if (has_name) {
      node_name = segments.pop();
      if (typeof node_name == "undefined" || node_name === "") {
        throw new Error("Empty node name in " + path);
      }
      output.name = node_name;
    } else {
      node_name = "";
    }
    output.segments = segments;

    return output;
  }

  /**
   * Join the paths segments with the path separator
   * @param args Paths to join
   * @returns New display path that joined all of them
   */
  join_path(...args: string[]): string {
    let out: string = "";
    for (let i = 0; i < args.length; i++) {
      if (i === 0) {
        out += trim_end(args[i], "/");
      } else {
        out += trim(args[i], "/");
      }
      if (i < args.length - 1) {
        out += "/";
      }
    }

    return out;
  }

  /**
   * Attach an arbitrary object to a tree path
   * @param path The tree path to write to in the format /aaa/bbb/ccc
   * @param obj The object to attach to the path
   */
  add(path: string, obj: ObjType): void {
    const target = this.__class__.get_segments(path);
    let actual_branch = this.datastruct;
    for (let i = 0; i < target.segments.length; i++) {
      const segment = target.segments[i];
      if (!actual_branch.subtrees.hasOwnProperty(segment)) {
        actual_branch.subtrees[segment] = {
          objects: {},
          subtrees: {},
        } as unknown as Node<ObjType>;
      }
      actual_branch = actual_branch.subtrees[segment];
    }
    if (target.name !== null) {
      actual_branch.objects[target.name] = obj;
      this.nb_obj++;
    }
  }

  path_valid(path: string): boolean {
    let target = this.__class__.get_segments(path, false);
    let actual_branch = this.datastruct;
    for (let i = 0; i < target.segments.length; i++) {
      let segment = target.segments[i];
      if (i < target.segments.length - 1) {
        if (!actual_branch.subtrees.hasOwnProperty(segment)) {
          return false;
        }
      } else {
        if (
          !actual_branch.subtrees.hasOwnProperty(segment) &&
          !actual_branch.objects.hasOwnProperty(segment)
        ) {
          return false;
        }
      }
      actual_branch = actual_branch.subtrees[segment];
    }
    return true;
  }

  /**
   * Returns the object attached to the given path.
   * @param path The tree path to read from in the format /aaa/bbb/ccc
   * @returns The arbitrary object attached to the path
   */
  get_obj(path: string): any {
    let error_str = "" + path + " does not exist in the tree";
    let target = this.__class__.get_segments(path);

    let actual_branch = this.datastruct;
    for (let i = 0; i < target.segments.length; i++) {
      let segment = target.segments[i];
      if (!actual_branch.subtrees.hasOwnProperty(segment)) {
        throw error_str;
      }
      actual_branch = actual_branch.subtrees[segment];
    }

    if (target.name == null) {
      throw error_str;
    }

    if (!actual_branch.objects.hasOwnProperty(target.name)) {
      throw error_str;
    }

    return actual_branch.objects[target.name];
  }

  /**
   * Return the child nodes of a path and tell if subtrees exists
   * @param path The tree path to fetch the children from in the format /aaa/bbb/ccc
   * @returns Returns the tree branch
   *
   */
  get_children(path: string): ShallowNodeDescription<ObjType> {
    const that = this;
    let children = {
      objects: {},
      subtrees: {},
    } as unknown as ShallowNodeDescription<ObjType>;
    const error_str = "" + path + " does not exist in the tree";
    let target = this.__class__.get_segments(path, false); // false means no name

    let actual_branch = this.datastruct;
    for (let i = 0; i < target.segments.length; i++) {
      let segment = target.segments[i];
      if (!actual_branch.subtrees.hasOwnProperty(segment)) {
        throw error_str;
      }
      actual_branch = actual_branch.subtrees[segment];
    }

    let subtree_names = Object.keys(actual_branch.subtrees);
    children.objects = actual_branch.objects;
    let subtrees: ShallowSubtreeDict = {};
    subtree_names.forEach(function (elem, index) {
      subtrees[elem] = {
        display_path: that.join_path(path, elem),
        has_objects:
          Object.keys(actual_branch.subtrees[elem].objects).length > 0,
        has_subtrees:
          Object.keys(actual_branch.subtrees[elem].subtrees).length > 0,
      };
    });

    children.subtrees = subtrees;

    return children;
  }

  /**
   * Return the list of all object paths in the tree
   * @returns the list of paths
   */
  get_all_paths(): string[] {
    const result = this.get_all_paths_recursive();
    if (result == null) {
      throw new Error("No paths available"); // Should never happen. Make static analyzer happy
    }
    return result;
  }

  get_all_paths_recursive(
    path?: string,
    recursive_list?: string[],
    array_index?: number
  ): string[] | null {
    if (typeof path === "undefined") {
      path = "";
    }

    if (typeof recursive_list === "undefined") {
      recursive_list = new Array(this.count());
    }

    if (typeof array_index === "undefined") {
      array_index = 0;
    }

    let children = this.get_children(path);

    let object_names = Object.keys(children.objects);
    for (let i = 0; i < object_names.length; i++) {
      recursive_list[array_index++] = path + "/" + object_names[i];
    }

    let subtrees = Object.keys(children.subtrees);
    for (let i = 0; i < subtrees.length; i++) {
      this.get_all_paths_recursive(
        path + "/" + subtrees[i],
        recursive_list,
        array_index
      );
    }

    if (path === "") {
      return recursive_list;
    } else {
      return null;
    }
  }

  /**
   * Return all objects stored in the tree
   * @returns List of objects
   */
  get_all_obj(): any[] {
    const result = this.get_all_obj_recursive();
    if (result == null) {
      throw new Error("No objects available"); // Should never happen. Make static analyzer happy
    }
    return result;
  }

  get_all_obj_recursive(
    path?: string,
    recursive_list?: ObjType[],
    array_index?: number
  ): ObjType[] | null {
    if (typeof path === "undefined") {
      path = "";
    }

    if (typeof recursive_list === "undefined") {
      recursive_list = new Array<ObjType>(this.count());
    }

    if (typeof array_index === "undefined") {
      array_index = 0;
    }

    const children = this.get_children(path);
    const object_names = Object.keys(children.objects);
    for (let i = 0; i < object_names.length; i++) {
      recursive_list[array_index++] = children.objects[object_names[i]];
    }

    let subtrees = Object.keys(children.subtrees);
    for (let i = 0; i < subtrees.length; i++) {
      this.get_all_obj_recursive(
        path + "/" + subtrees[i],
        recursive_list,
        array_index
      );
    }

    if (path === "") {
      return recursive_list;
    } else {
      return null;
    }
  }
}
