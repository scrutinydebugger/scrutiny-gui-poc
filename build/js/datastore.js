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
        this.display_path_to_entry_dict = {}

        this.display_path_list_per_type = {}
        this.display_path_list_per_type[DatastoreEntryType.Var] = [];
        this.display_path_list_per_type[DatastoreEntryType.Alias] = [];
    }

    add(entry_type, entry) {
        this.display_path_to_entry_dict[entry.display_path] = entry
        this.display_path_list_per_type[entry_type].push(entry.display_path)
    }

    add_from_server_def(entry_type, data) {
        this.add(entry_type, DatastoreEntry.from_server_def(entry_type, data))
    }

    all_display_path() {
        return this.display_path_list
    }

    get_server_id(display_path) {
        return this.display_path_to_entry_dict[display_path]
    }

    get_entries(entry_type) {
        let count = this.get_count(entry_type)
        let list = new Array(count)

        for (let i = 0; i < this.display_path_list_per_type[entry_type].length; i++) {
            let display_path = this.display_path_list_per_type[entry_type][i]
            list[i] = this.display_path_to_entry_dict[display_path]
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

}