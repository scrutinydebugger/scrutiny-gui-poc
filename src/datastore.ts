// @ts-check
;("use strict")

import { App } from "./app"
import { Tree } from "./tree"
import { trim } from "./tools"
import * as API from "./server_api"

type ValueChangeCallback = (val: number) => void

export enum DatastoreEntryType {
    Var = "var",
    Alias = "alias",
    RPV = "rpv",
}

export var AllDatastoreEntryTypes = [] as DatastoreEntryType[]

let keys = Object.keys(DatastoreEntryType)
for (let i = 0; i < keys.length; i++) {
    AllDatastoreEntryTypes.push(DatastoreEntryType[keys[i]])
}

/**
 * Represent an entry in the datastore. Each entry represent an interface to something that can be read and/or written
 * in the device owned by the server
 */
export class DatastoreEntry {
    /** The type of entry : Alias, Variable, RPV */
    entry_type: DatastoreEntryType

    /** The server ID used by the API associated with the entry */
    server_id: string

    /** The display path used to put the entry in a Tree structure */
    display_path: string

    /** The datatype of the embedded value associated with this entry (uint32, float64, etc.) */
    datatype: API.ValueDataType

    /** The definition of the enum if it exists. null if no enum is associated with this entry */
    enumdef: API.EnumDefinition | null

    /** The numberical value of the entry */
    value: number

    /** A list of callback classified by watchers. These callback are called when the value changes. */
    callbacks: {
        [index: string]: ValueChangeCallback[]
    }

    constructor(
        entry_type: DatastoreEntryType,
        server_id: string,
        display_path: string,
        datatype: API.ValueDataType,
        enumdef: API.EnumDefinition | null = null
    ) {
        this.entry_type = entry_type
        this.server_id = server_id
        this.display_path = display_path
        this.datatype = datatype
        this.enumdef = enumdef
        this.value = null
        this.callbacks = {}
    }

    /**
     * Create a DatastoreEntry from the JSON received by the server through the API
     * @param entry_type The type of the entry to create
     * @param data The data gotten from the server
     * @returns A datastore entry that match the server definition
     */
    static from_server_def(entry_type: DatastoreEntryType, data: API.WatchableEntryServerDefinition): DatastoreEntry {
        let enumdef: API.EnumDefinition | null = null
        if (data.hasOwnProperty("enum")) {
            enumdef = data["enum"]
        }

        const entry = new DatastoreEntry(entry_type, data["id"], data["display_path"], data["datatype"], enumdef)
        return entry
    }

    /**
     * Sets the value of the entry
     * @param val The numerical value
     */
    set_value(val: number): void {
        this.value = val
        const that = this
        Object.keys(this.callbacks).forEach(function (watcher) {
            that.callbacks[watcher].forEach(function (cb) {
                cb(val)
            })
        })
    }

    /**
     * Reads the value of the entry
     * @returns The numerical value
     */
    get_value(): number {
        return this.value
    }

    /**
     * Add a callback to eb called when the value of this entry changes
     * @param watcher The watcher identifier
     * @param cb The callback to call on value change
     */
    watch(watcher: string, cb: ValueChangeCallback): void {
        if (!this.callbacks.hasOwnProperty(watcher)) {
            this.callbacks[watcher] = []
        }
        this.callbacks[watcher].push(cb)
    }

    /**
     * Removes all callback associated with a specific watcher
     * @param watcher The watcher identifier
     */
    unwatch(watcher: string): void {
        if (this.callbacks.hasOwnProperty(watcher)) {
            delete this.callbacks[watcher]
        }
    }

    /**
     * Tells if at least one watcher has subscribed to this entry
     * @returns True if at least one watcher has subscribed
     */
    has_watchers(): boolean {
        return Object.keys(this.callbacks).length > 0
    }
}

type DatastoreEntryCacheType = Record<
    DatastoreEntryType,
    {
        [index: string]: DatastoreEntry
    }
>

type DatastoreTreesType = Record<DatastoreEntryType, Tree>
type DatastoreReadyType = Record<DatastoreEntryType, boolean>

export interface DatastorePathChildren {
    entries: Record<string, DatastoreEntry>
    subfolders: string[]
}

/**
 * Store datastore entries using a tree like structure.
 * Should represent a subset of the datastore in the server
 */
export class Datastore {
    /** A reference to the application using the datastore */
    app: App

    /** A dictionary used to cache the entries read by a given display path and avoid searching every time. One cache by entry type */
    entry_cache: DatastoreEntryCacheType

    /** A list of Tree object (one per datastore entry type) */
    trees: DatastoreTreesType

    /** A list of boolean per entry type indicating of that type of entries has been loaded and ready to eb used  */
    ready: DatastoreReadyType

    /** A map between server ID string and datastore entries for quicker access */
    serverid2entry: { [index: string]: DatastoreEntry }

    /** A map between a watcher and all the entries it is watching. Mainly used to unwatch all entries when a watchers dies (window closed)*/
    watcher2entry: { [index: string]: Set<DatastoreEntry> }

    /** A set of all the entries that are watched */
    watched_entries: Set<DatastoreEntry>

    constructor(app) {
        this.app = app
        this.entry_cache = {} as DatastoreEntryCacheType
        this.trees = {} as DatastoreTreesType
        this.ready = {} as DatastoreReadyType
        for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
            let entry_type = AllDatastoreEntryTypes[i]
            this.trees[entry_type] = new Tree()
            this.entry_cache[entry_type] = {}
        }

        this.clear_silent()
    }

    /**
     * Delete all the entries with the given entry types. Trigger an event
     * @param entry_types The entry types to delete from the datastore. All if omitted
     */
    clear(entry_types?: DatastoreEntryType[]) {
        if (typeof entry_types === "undefined") {
            entry_types = AllDatastoreEntryTypes
        }
        this.clear_silent(entry_types)

        for (let i = 0; i < entry_types.length; i++) {
            const entry_type = entry_types[i]
            this.app.trigger_event("scrutiny.datastore.clear", { entry_type: entry_type })
        }
    }

    /**
     * Does the same as clear, but doe snot trigger an event.
     * @param entry_types The entry types to delete from the datastore. All if omitted
     */
    clear_silent(entry_types?: DatastoreEntryType[]): void {
        if (typeof entry_types === "undefined") {
            entry_types = AllDatastoreEntryTypes
        }

        for (let i = 0; i < entry_types.length; i++) {
            const entry_type = entry_types[i]
            this.trees[entry_type] = new Tree()
            this.entry_cache[entry_type] = {}
            this.ready[entry_type] = false
        }

        // Fixme: 2022-11-12 - PYL - should b by type! To be fixed after TypeScript conversion
        this.serverid2entry = {}
        this.watcher2entry = {}
        this.watched_entries = new Set()
    }

    /**
     * Adds a callback on the given entry so that the watcher gets notified upon value change. The entry will be marked
     * to have a watcher
     * @param entry_type The type of the entry to watch
     * @param entry The display path of the entry
     * @param watcher A string identifying the watcher
     * @param callback The callback to call when the value of the entry changes
     */
    watch(entry_type: DatastoreEntryType, entry: DatastoreEntry | string, watcher: string, callback: ValueChangeCallback): void {
        entry = this.get_entry(entry_type, entry)
        entry.watch(watcher, callback)
        if (!this.watcher2entry.hasOwnProperty(watcher)) {
            this.watcher2entry[watcher] = new Set()
        }
        this.watcher2entry[watcher].add(entry)

        if (!this.watched_entries.has(entry)) {
            this.watched_entries.add(entry)
            this.app.trigger_event("scrutiny.datastore.start_watching", { entry: entry })
        }
    }

    /**
     * Remove all callback for a given watcher
     * @param watcher The watcher
     */
    unwatch_all(watcher: string): void {
        const that = this
        if (this.watcher2entry.hasOwnProperty(watcher)) {
            this.watcher2entry[watcher].forEach(function (entry) {
                entry.unwatch(watcher)
                if (!entry.has_watchers()) {
                    that.app.trigger_event("scrutiny.datastore.stop_watching", { entry: entry })
                    that.watched_entries.delete(entry)
                }
            })
            delete this.watcher2entry[watcher]
        }
    }

    /**
     * Return a list of all entries being watched
     * @returns The entries
     */
    get_watched_entries(): DatastoreEntry[] {
        return Array.from(this.watched_entries.values())
    }

    /**
     * Adds an entry to the datastore
     * @param entry The entry to add
     */
    add(entry: DatastoreEntry): void {
        this.trees[entry.entry_type].add(entry.display_path, entry)

        if (this.serverid2entry.hasOwnProperty(entry.server_id)) {
            throw "Duplicate server ID in datastore" + entry.server_id
        }
        this.serverid2entry[entry.server_id] = entry
    }

    /**
     * Fetch an entry from the datastore identified by its display path (tree-like structure)
     * @param entry_type The type of the entry to fetch
     * @param path The display path used for tree sotrage
     * @returns The datastore entry stored
     */
    get_entry(entry_type: DatastoreEntryType, path: string | DatastoreEntry): DatastoreEntry {
        if (typeof path !== "string") {
            path = path.display_path // Shortcut to read the tree from an entry object.
        }

        if (!this.entry_cache[entry_type].hasOwnProperty(path)) {
            this.entry_cache[entry_type][path] = this.trees[entry_type].get_obj(path)
        }
        return this.entry_cache[entry_type][path]
    }

    /**
     * Tells if a node identified by its display path exists in the datastore
     * @param entry_type The tupe of the entry
     * @param path The display path used for tree storage
     * @returns true if the entry exists
     */
    node_exist(entry_type: DatastoreEntryType, path: string): boolean {
        try {
            this.trees[entry_type].get_obj(path)
            return true
        } catch (err) {
            return false
        }
    }

    /**
     * Creates and add an entry defined by the server JSON definition gotten from the API
     * @param entry_type The type of the entry to add
     * @param def The server definition of the entry
     */
    add_from_server_def(entry_type: DatastoreEntryType, def: API.WatchableEntryServerDefinition): void {
        this.add(DatastoreEntry.from_server_def(entry_type, def))
    }

    /**
     * Return the list of display path of all entries in the datastore for a given entry type
     * @param entry_type The type of the entry
     * @returns The list of possible display paths
     */
    all_display_path(entry_type: DatastoreEntryType): string[] {
        return this.trees[entry_type].get_all_paths()
    }

    /**
     * Return the server id of an entry from its display path
     * @param entry_type The type of the entry
     * @param display_path  The display path used for tree storage
     * @returns The server ID
     */
    get_server_id(entry_type: DatastoreEntryType, display_path: string): string {
        return this.trees[entry_type].get_obj(display_path).server_id
    }

    /**
     * Fetch an entry from the datastore identified by the server ID
     * @param server_id The server ID of the entry
     * @returns the datastore entry
     */
    get_entry_from_server_id(server_id: string): DatastoreEntry {
        if (!this.serverid2entry.hasOwnProperty(server_id)) {
            throw "No entry with server ID " + server_id + " in datastore"
        }
        return this.serverid2entry[server_id]
    }

    /**
     * Return all entries in the datastore of the given type
     * @param entry_type The type of the entries
     * @returns Array of entries
     */
    get_entries(entry_type: DatastoreEntryType): DatastoreEntry[] {
        return this.trees[entry_type].get_all_obj()
    }

    /**
     * Write the value of the given entry in the datastore identified by its tree path
     * @param entry_type  The type of the entries
     * @param entry_path The display path used for tree storage.
     * @param val Value to set
     */
    set_value(entry_type: DatastoreEntryType, entry_path: string, val: number): void {
        this.get_entry(entry_type, entry_path).set_value(val)
    }

    /**
     * Write the value of the given entry in the datastore identified by its server od
     * @param server_id The server ID of the entry
     * @param val Value to set
     */
    set_value_from_server_id(server_id: string, val: number): void {
        const entry = this.get_entry_from_server_id(server_id)
        this.get_entry(entry.entry_type, entry).set_value(val)
    }

    /**
     * REads the value of the given entry in the datastore
     * @param entry_type  The type of the entries
     * @param entry_path The display path used for tree storage.
     * @returns  The actual value of the entrye
     */
    get_value(entry_type: DatastoreEntryType, entry_path: string): number {
        return this.get_entry(entry_type, entry_path).get_value()
    }

    /**
     * Return the number of entries in the datastore of the given type
     * @param entry_type The type of the entries
     * @returns The number of entries
     */
    get_count(entry_type?: DatastoreEntryType): number | Record<DatastoreEntryType, number> {
        if (typeof entry_type == "undefined") {
            let obj_out = {} as Record<DatastoreEntryType, number>
            for (let i = 0; i < AllDatastoreEntryTypes.length; i++) {
                obj_out[AllDatastoreEntryTypes[i]] = this.trees[AllDatastoreEntryTypes[i]].count()
            }
            return obj_out
        } else {
            return this.trees[entry_type].count()
        }
    }

    /**
     * Mark a given entry type (variable, alias, RPV) to be ready for usage, meaning it has been fully loaded.
     * Will launch a scrutiny.datastore.read event
     * @param entry_type The type of the entries
     */
    set_ready(entry_type: DatastoreEntryType): void {
        if (this.ready[entry_type] == false) {
            this.app.trigger_event("scrutiny.datastore.ready", { entry_type: entry_type })
        }
        this.ready[entry_type] = true
    }

    /**
     * Returns true if the entry type has been flagged ready (loaded from server, most likely)
     * @param entry_type The type of the entries
     * @returns true if the entry type has been flagged ready
     */
    is_ready(entry_type: DatastoreEntryType): boolean {
        return this.ready[entry_type]
    }

    /**
     * Returns the children under a path of a given type.
     * @param entry_type The type of the entries
     * @param path The display path used for tree storage.
     * @returns The information about what is stored at the given level
     */
    get_children(entry_type: DatastoreEntryType, path: string): DatastorePathChildren {
        let children = {
            entries: {},
            subfolders: [],
        }

        Object.keys(DatastoreEntryType).forEach(function (typeval, i) {
            children["entries"][DatastoreEntryType[typeval]] = []
        })

        let tree_children = null
        try {
            tree_children = this.trees[entry_type].get_children(path)
        } catch (e) {
            // Path does not exist, returns nothing
            return children
        }

        let folders = tree_children["subtrees"]
        let nodes = tree_children["nodes"]
        let node_names = Object.keys(nodes).sort()
        let folder_names = Object.keys(folders).sort()
        for (let i = 0; i < node_names.length; i++) {
            let node = nodes[node_names[i]]
            node["name"] = trim(node.display_path, "/").split("/").pop()
            if (entry_type == null || entry_type == node.entry_type) {
                children["entries"][node.entry_type].push(node)
            }
        }

        folder_names.forEach(function (folder_name, i) {
            children["subfolders"].push({
                name: folder_name,
                children: folders[folder_name]["has_nodes"] || folders[folder_name]["has_subtrees"],
            })
        })

        return children
    }
}
