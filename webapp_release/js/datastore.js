import { Tree } from "./tree.js";
import {DatastoreEntryType} from './global_definitions.js'
import { trim } from "./tools.js"

export class DatastoreEntry {
    constructor(entry_type, server_id, display_path, datatype, enumdef = null) {
        this.entry_type = entry_type
        this.server_id = server_id
        this.display_path = display_path
        this.datatype = datatype
        this.enumdef = enumdef
        this.value = null
        this.callbacks = {}
    }


    static from_server_def(entry_type, data) {
        let enumdef = null
        if (data.hasOwnProperty('enum')) {
            enumdef = data['enum']
        }

        let entry = new DatastoreEntry(entry_type, data['id'], data['display_path'], data['datatype'], enumdef)
        return entry
    }

    set_value(val){
        this.value = val;
        let that = this
        Object.keys(this.callbacks).forEach(function(watcher) {
            that.callbacks[watcher].forEach(function(cb){
                cb(val)
            })
        })
    }

    get_value(){
        return this.value
    }

    watch(watcher, cb){
        if (!this.callbacks.hasOwnProperty(watcher)){
            this.callbacks[watcher] = []
        }
        this.callbacks[watcher].push(cb)
    }

    unwatch(watcher){
        if (this.callbacks.hasOwnProperty(watcher)){
            delete this.callbacks[watcher]
        }
    }

    has_watchers(){
        return Object.keys(this.callbacks).length > 0
    }
}

export class Datastore {

    constructor() {
        this.clear_silent()
    }

    clear() {
        this.clear_silent()
        $.event.trigger({
            type: "scrutiny.datastore.clear"
        });
    }

    clear_silent() {
        this.ready = false
        this.tree = new Tree()
        this.entry_cache = {}

        this.display_path_list_per_type = {}
        this.display_path_list_per_type[DatastoreEntryType.Var] = [];
        this.display_path_list_per_type[DatastoreEntryType.Alias] = [];
        this.display_path_list_per_type[DatastoreEntryType.RPV] = [];

        this.serverid2entry = {}
        this.watcher2entry = {}
        this.watched_entries = new Set()

    }

    watch(entry, watcher, callback){
        entry = this.get_entry(entry)
        entry.watch(watcher, callback)
        if (!this.watcher2entry.hasOwnProperty(watcher)){
            this.watcher2entry[watcher] = new Set()
        }
        this.watcher2entry[watcher].add(entry)
        
        if (!this.watched_entries.has(entry))
        {
            this.watched_entries.add(entry)
            $.event.trigger({
                type: "scrutiny.datastore.start_watching",
                entry: entry
            });
        }
    }

    unwatch_all(watcher){
        let that = this
        if (this.watcher2entry.hasOwnProperty(watcher)){
            this.watcher2entry[watcher].forEach(function(entry){
                entry.unwatch(watcher)
                if (!entry.has_watchers()){
                    $.event.trigger({
                        type: "scrutiny.datastore.stop_watching",
                        entry : entry
                    });
                    that.watched_entries.delete(entry)
                }
            })
            delete this.watcher2entry[watcher]

        }
    }

    get_watched_entries(){
        return Array.from(this.watched_entries.values())
    }
    
    add(entry) {
        this.tree.add(entry.display_path, entry)
        this.display_path_list_per_type[entry.entry_type].push(entry.display_path)
        
        if (this.serverid2entry.hasOwnProperty(entry.server_id)){
            throw "Duplicate server ID in datastore" + entry.server_id
        }
        this.serverid2entry[entry.server_id] = entry
    }

    get_entry(o){
        if (typeof(o) !== 'string')
        {
            o = o.display_path
        }

        if (!this.entry_cache.hasOwnProperty(o)){
            this.entry_cache[o] = this.tree.get_obj(o)
        }
        return this.entry_cache[o]
    }

    // Tells if a node identified by its display path exists in the datastore
    node_exist(path) {
        try {
            this.tree.get_obj(path)
            return true
        } catch {
            return false
        }
    }

    add_from_server_def(entry_type, data) {
        this.add(DatastoreEntry.from_server_def(entry_type, data))
    }

    // Return the list of display path of all entries in the datastore for a given entry type
    all_display_path(entry_type) {
        return this.display_path_list_per_type[entry_type]
    }

    // Return the server id of an entry from its display path
    get_server_id(display_path) {
        return this.tree.get_obj(display_path).server_id
    }

    get_entry_from_server_id(server_id){
        if (!this.serverid2entry.hasOwnProperty(server_id)){
            throw "No entry with server ID " + server_id + " in datastore"
        }
        return this.serverid2entry[server_id]
    }

    // Return all entries in the datastore of the given type
    get_entries(entry_type) {
        let count = this.get_count(entry_type)
        let list = new Array(count)

        for (let i = 0; i < this.display_path_list_per_type[entry_type].length; i++) {
            let display_path = this.display_path_list_per_type[entry_type][i]
            list[i] = this.get_entry(display_path)
        }
        return list
    }

    set_value(entry, val){
        return this.get_entry(entry).set_value(val)
    }

    get_value(entry){
        return this.get_entry(entry).get_value()
    }

    // Return the number of entries in the datastore of the given type
    get_count(entry_type) {
        if (typeof(entry_type) == 'undefined') {

            let obj_out = {}
            obj_out[DatastoreEntryType.Var] = this.display_path_list_per_type[DatastoreEntryType.Var].length;
            obj_out[DatastoreEntryType.Alias] = this.display_path_list_per_type[DatastoreEntryType.Alias].length;
            return obj_out
        } else {
            return this.display_path_list_per_type[entry_type].length;
        }
    }

    set_ready() {
        if (this.ready == false) {
            $.event.trigger({
                type: "scrutiny.datastore.ready"
            });
        }
        this.ready = true
    }

    is_ready() {
        return this.ready
    }

    get_children(path, entry_type = null) {
        let tree_objs = this.tree.get_children(path)

        let children = {
            'entries': {},
            'subfolders': []
        }

        Object.keys(DatastoreEntryType).forEach(function(typeval, i) {
            children['entries'][DatastoreEntryType[typeval]] = []
        })


        let folders = tree_objs['subtrees'];
        let nodes = tree_objs['nodes'];
        let node_names = Object.keys(nodes).sort()
        let folder_names = Object.keys(folders).sort()
        for (let i = 0; i < node_names.length; i++) {
            let node = nodes[node_names[i]];
            node['name'] = trim(node.display_path, '/').split('/').pop()
            if (entry_type == null || entry_type == node.entry_type) {
                children['entries'][node.entry_type].push(node)
            }
        }

        folder_names.forEach(function(folder_name, i) {
            children['subfolders'].push({
                'name': folder_name,
                'children': folders[folder_name]['has_nodes'] || folders[folder_name]['has_subtrees']
            })
        })

        return children
    }

}
