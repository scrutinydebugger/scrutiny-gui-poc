class DatastoreEntry {
    constructor(entry_type, server_id, display_path, datatype, enumdef = null) {
        this.entry_type = entry_type
        this.server_id = server_id
        this.display_path = display_path
        this.datatype = datatype
        this.enumdef = enumdef
    }


    static from_server_def(entry_type, data) {
        let enumdef = null
        if (data.hasOwnProperty('enum')) {
            enumdef = data['enum']
        }

        let entry = new DatastoreEntry(entry_type, data['id'], data['display_path'], data['datatype'], enumdef)
        return entry
    }
}

class Datastore {

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

        this.display_path_list_per_type = {}
        this.display_path_list_per_type[DatastoreEntryType.Var] = [];
        this.display_path_list_per_type[DatastoreEntryType.Alias] = [];
    }



    add(entry_type, entry) {

        this.tree.add(entry.display_path, entry)
        this.display_path_list_per_type[entry_type].push(entry.display_path)
    }

    node_exist(path) {
        try {
            this.tree.get_obj(path)
            return true
        } catch {
            return false
        }
    }

    add_from_server_def(entry_type, data) {
        this.add(entry_type, DatastoreEntry.from_server_def(entry_type, data))
    }

    all_display_path() {
        return this.display_path_list
    }

    get_server_id(display_path) {
        return this.tree.get_obj_obj(display_path).server_id
    }

    get_entries(entry_type) {
        let count = this.get_count(entry_type)
        let list = new Array(count)

        for (let i = 0; i < this.display_path_list_per_type[entry_type].length; i++) {
            let display_path = this.display_path_list_per_type[entry_type][i]
            list[i] = this.tree.get_obj(display_path)
        }
        return list
    }

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