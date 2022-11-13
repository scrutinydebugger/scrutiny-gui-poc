// @ts-check
"use strict"

import { trim } from "./tools"

interface TreeNodeList {
    [index: string]: any
}

interface ShallowSubtree {
    [index: string]: {
        has_nodes: boolean
        has_subtrees: boolean
    }
}

interface ShallowNodeDescription {
    nodes: TreeNodeList
    subtrees: ShallowSubtree
}

interface TreeStruct {
    [index: string]: {
        nodes: TreeNodeList
        subtrees: TreeStruct
    }
}

interface Segments {
    name?: string
    segments: string[]
}

/**
 * Store objects into a tree like structure where each position is identified by a path
 * of the form /aaa/bbb/ccc. Allows log complexity search
 */
export class Tree {
    datastruct: TreeStruct
    nb_obj: number

    constructor() {
        this.datastruct = {
            nodes: {},
            subtrees: {},
        } as unknown as TreeStruct
        this.nb_obj = 0
    }
    count() {
        return this.nb_obj
    }

    /**
     * Parse a string in the format /aaa/bbb/ccc and returns all parts of the path
     * @param path The path the parse
     * @param has_name When true, the last segment is considered as the name and is provided in the "name" property. When false,
     * all segments are added to the segments output
     * @returns A the list of segments in the path
     */
    get_segments(path: string, has_name: boolean = true): Segments {
        let output = {
            segments: [],
        } as Segments
        let segments = trim(path, "/").split("/")
        let nodename = ""
        segments = segments.filter((s) => s !== "")

        if (has_name) {
            nodename = segments.pop()
            if (nodename === "") {
                throw "Empty node name"
            }
            output["name"] = nodename
        }
        output["segments"] = segments

        return output
    }

    /**
     * Attach an arbitrary object to a tree path
     * @param path The tree path to write to in the format /aaa/bbb/ccc
     * @param obj The object to attach to the path
     */
    add(path: string, obj: any): void {
        let target = this.get_segments(path)
        let actual_branch = this.datastruct
        for (let i = 0; i < target["segments"].length; i++) {
            let segment = target["segments"][i]
            if (!actual_branch["subtrees"].hasOwnProperty(segment)) {
                actual_branch["subtrees"][segment] = {
                    nodes: {},
                    subtrees: {},
                }
            }
            actual_branch = actual_branch["subtrees"][segment]
        }

        actual_branch["nodes"][target["name"]] = obj
        this.nb_obj++
    }

    /**
     * Returns the object attached to the given path.
     * @param path The tree path to read from in the format /aaa/bbb/ccc
     * @returns The arbitrary object attached to the path
     */
    get_obj(path: string): any {
        let error_str = "" + path + " does not exist in the tree"
        let target = this.get_segments(path)

        let actual_branch = this.datastruct
        for (let i = 0; i < target["segments"].length; i++) {
            let segment = target["segments"][i]
            if (!actual_branch["subtrees"].hasOwnProperty(segment)) {
                throw error_str
            }
            actual_branch = actual_branch["subtrees"][segment]
        }
        if (!actual_branch["nodes"].hasOwnProperty(target["name"])) {
            throw error_str
        }

        return actual_branch["nodes"][target["name"]]
    }

    /**
     * Return the child nodes of a path and tell if subtrees exists
     * @param path The tree path to fetch the children from in the format /aaa/bbb/ccc
     * @returns Returns the tree branch
     *
     */
    get_children(path: string): ShallowNodeDescription {
        let children = {
            nodes: {},
            subtrees: {},
        } as unknown as ShallowNodeDescription
        const error_str = "" + path + " does not exist in the tree"
        let target = this.get_segments(path, false) // false means no name

        let actual_branch = this.datastruct
        for (let i = 0; i < target["segments"].length; i++) {
            let segment = target["segments"][i]
            if (!actual_branch["subtrees"].hasOwnProperty(segment)) {
                throw error_str
            }
            actual_branch = actual_branch["subtrees"][segment]
        }

        let subtree_names = Object.keys(actual_branch["subtrees"])
        children["nodes"] = actual_branch["nodes"]
        let subtrees: ShallowSubtree = {}
        subtree_names.forEach(function (elem, index) {
            subtrees[elem] = {
                has_nodes: Object.keys(actual_branch["subtrees"][elem]["nodes"]).length > 0,
                has_subtrees: Object.keys(actual_branch["subtrees"][elem]["subtrees"]).length > 0,
            }
        })

        children["subtrees"] = subtrees

        return children
    }

    /**
     * Return the list of all object paths in the tree
     * @returns the list of paths
     */
    get_all_paths(): string[] {
        const result = this.get_all_paths_recursive()
        if (result == null) {
            throw "No paths available" // Should never happen. Make static analyzer happy
        }
        return result
    }

    get_all_paths_recursive(path?: string, thelist?: string[], array_index?: number): string[] | null {
        if (typeof path === "undefined") {
            path = ""
        }

        if (typeof thelist === "undefined") {
            thelist = new Array(this.count())
        }

        if (typeof array_index === "undefined") {
            array_index = 0
        }

        let children = this.get_children(path)

        let node_names = Object.keys(children.nodes)
        for (let i = 0; i < node_names.length; i++) {
            thelist[array_index++] = path + "/" + node_names[i]
        }

        let subtrees = Object.keys(children.subtrees)
        for (let i = 0; i < subtrees.length; i++) {
            this.get_all_paths_recursive(path + "/" + subtrees[i], thelist, array_index)
        }

        if (path === "") {
            return thelist
        } else {
            return null
        }
    }

    /**
     * Return all objects stored in the tree
     * @returns List of objects
     */
    get_all_obj(): any[] {
        const result = this.get_all_obj_recursive()
        if (result == null) {
            throw "No objects available" // Should never happen. Make static analyzer happy
        }
        return result
    }

    get_all_obj_recursive(path?: string, thelist?: string[], array_index?: number): string[] | null {
        if (typeof path === "undefined") {
            path = ""
        }

        if (typeof thelist === "undefined") {
            thelist = new Array(this.count())
        }

        if (typeof array_index === "undefined") {
            array_index = 0
        }

        let children = this.get_children(path)

        let node_names = Object.keys(children.nodes)
        for (let i = 0; i < node_names.length; i++) {
            thelist[array_index++] = children.nodes[node_names[i]]
        }

        let subtrees = Object.keys(children.subtrees)
        for (let i = 0; i < subtrees.length; i++) {
            this.get_all_obj_recursive(path + "/" + subtrees[i], thelist, array_index)
        }

        if (path === "") {
            return thelist
        }
    }
}
