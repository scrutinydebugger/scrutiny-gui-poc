import { Tree } from "./tree.js";
import {DatastoreEntryType, AllDatastoreEntryTypes} from './global_definitions.js'
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

    constructor(app) {
        this.app = app
        this.entry_cache = {}
        this.trees = {}
        this.ready ={}
        for (let i=0; i<AllDatastoreEntryTypes.length; i++){
            let entry_type = AllDatastoreEntryTypes[i]
            this.trees[entry_type] = new Tree()
            this.entry_cache[entry_type] = {}
        }

        this.clear_silent()
    }

    clear(entry_types) {
        this.clear_silent(entry_types)
        this.app.trigger_event("scrutiny.datastore.clear")
    }

    clear_silent(entry_types) {
        if (typeof(entry_types) === 'undefined'){
            entry_types = AllDatastoreEntryTypes
        }

        for (let i=0; i<entry_types.length; i++){
            let entry_type = entry_types[i]
            this.trees[entry_type] = new Tree()
            this.entry_cache[entry_type] = {}
            this.ready[entry_type] = false
        }

        this.serverid2entry = {}
        this.watcher2entry = {}
        this.watched_entries = new Set()
    }

    watch(entry_type, entry, watcher, callback){
        entry = this.get_entry(entry_type, entry)
        entry.watch(watcher, callback)
        if (!this.watcher2entry.hasOwnProperty(watcher)){
            this.watcher2entry[watcher] = new Set()
        }
        this.watcher2entry[watcher].add(entry)
        
        if (!this.watched_entries.has(entry))
        {
            this.watched_entries.add(entry)
            this.app.trigger_event("scrutiny.datastore.start_watching", {"entry":entry})
        }
    }

    unwatch_all(watcher){
        let that = this
        if (this.watcher2entry.hasOwnProperty(watcher)){
            this.watcher2entry[watcher].forEach(function(entry){
                entry.unwatch(watcher)
                if (!entry.has_watchers()){
                    that.app.trigger_event("scrutiny.datastore.stop_watching", {"entry":entry})
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
        this.trees[entry.entry_type].add(entry.display_path, entry)
        
        if (this.serverid2entry.hasOwnProperty(entry.server_id)){
            throw "Duplicate server ID in datastore" + entry.server_id
        }
        this.serverid2entry[entry.server_id] = entry
    }

    get_entry(entry_type, path){
        if (typeof(path) !== 'string'){
            path = path.display_path  // Shortcut to read the tree from an entry object.
        }

        if (!this.entry_cache[entry_type].hasOwnProperty(path)){
            this.entry_cache[entry_type][path] = this.trees[entry_type].get_obj(path)
        }
        return this.entry_cache[entry_type][path]
    }

    // Tells if a node identified by its display path exists in the datastore
    node_exist(entry_type, path) {
        try {
            this.trees[entry_type].get_obj(path)
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
        return this.trees[entry_type].get_all_paths()
    }

    // Return the server id of an entry from its display path
    get_server_id(entry_type, display_path) {
        return this.trees[entry_type].get_obj(display_path).server_id
    }

    get_entry_from_server_id(server_id){
        if (!this.serverid2entry.hasOwnProperty(server_id)){
            throw "No entry with server ID " + server_id + " in datastore"
        }
        return this.serverid2entry[server_id]
    }

    // Return all entries in the datastore of the given type
    get_entries(entry_type) {
        return this.trees[entry_type].get_all_obj()
    }

    set_value(entry_type, entry_path, val){
        return this.get_entry(entry_type, entry_path).set_value(val)
    }

    get_value(entry_type, entry_path){
        return this.get_entry(entry_type, entry_path).get_value()
    }

    // Return the number of entries in the datastore of the given type
    get_count(entry_type) {
        if (typeof(entry_type) == 'undefined') {

            let obj_out = {}
            for (let i=0; i<AllDatastoreEntryTypes.length; i++){
                obj_out[AllDatastoreEntryTypes[i]] = this.trees[AllDatastoreEntryTypes[i]].count();
            }
            return obj_out
        } else {
            return this.trees[entry_type].count();
        }
    }

    set_ready(entry_type) {
        if (this.ready[entry_type] == false) {
            this.app.trigger_event("scrutiny.datastore.ready", {'entry_type':entry_type})
        }
        this.ready[entry_type] = true
    }

    is_ready(entry_type) {
        return this.ready[entry_type]
    }

    get_children(entry_type, path) {
        let tree_objs = this.trees[entry_type].get_children(path)

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
