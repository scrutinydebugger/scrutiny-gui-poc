class DatastoreEntry {
    constructor(entry_type, server_id, display_path, datatype, enumdef = null) {
        this.entry_type = entry_type
        this.server_id = server_id
        this.display_path = display_path
        this.datatype = datatype
        this.enumdef = enumdef
    }


    static from_server_def(entry_type, data) {
        enumdef = null
        if (data.hasOwnProperty('enum')) {
            enumdef = data['enum']
        }

        entry = new DatastoreEntry(entry_type, data['id'], data['display_path'], data['datatype'], enumdef)
        return entry
    }
}

class Datastore {

    constructor() {
        this.clear()
    }

    clear() {
        this.display_path_to_entry_dict = {}
        this.display_path_list = []
    }

    add(entry) {
        this.display_path_to_entry_dict[entry.display_path] = entry
        display_path_list.push(entry.display_path)
    }

    add_from_server_def(data) {
        this.add(DatastoreEntry.from_server_def(data))
    }

    all_display_path() {
        return this.display_path_list
    }

}