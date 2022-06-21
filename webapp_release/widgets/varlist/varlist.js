class VarListWidget {

    constructor(container, server_conn, datastore) {
        this.container = container
        this.server_conn = server_conn
        this.datastore = datastore
    }

    initialize() {
        this.container.html('<h2 style="text-align:center">VarList!</h2>');
        let that = this
        $(document).on('scrutiny.datastore.ready', function() {
            that.update_from_datastore()
        })

        $(document).on('scrutiny.datastore.clear', function() {
            that.clear()
        })


        if (this.datastore.is_ready()) {
            that.update_from_datastore()
        }

        $("#test_drop").on('drop', function(e) {
            e.preventDefault()

            $(this).text(e.originalEvent.dataTransfer.getData('display_path'))
        })


        $("#test_drop").on('dragover', function(e) {
            e.preventDefault()
        })

    }


    fetch_jstree_subnodes(parent, callback) {
        // jstree root has id="#"
        if (parent.id == "#") {
            callback([{
                "text": "/",
                "id": "/",
                "children": true
            }]);
        } else {
            let display_path = parent.id
            let children = this.datastore.get_children(display_path)

            let jstree_childrens = []

            // Add folders node
            children['subfolders'].forEach(function(subfolder, i) {
                jstree_childrens.push({
                    'text': subfolder.name,
                    'children': subfolder.children, // true if it has children
                    'id': display_path + "/" + subfolder.name
                })
            })

            // Add entries node
            Object.keys(DatastoreEntryType).forEach(function(typeval, i) {
                let entry_type = DatastoreEntryType[typeval]
                    // Entries are organized by entry type
                children['entries'][entry_type].forEach(function(entry, i) {

                    jstree_childrens.push({
                        'text': entry.name,
                        'id': entry.display_path
                    })
                })
            })

            callback(jstree_childrens)
        }
    }

    update_from_datastore() {
        this.container.html("")
        let that = this
        let ds = this.datastore

        let thetree = $("<div></div>").jstree({
            'core': {
                'data': function(obj, cb) {
                    that.fetch_jstree_subnodes(obj, cb)
                },
                'animation': 75
            }
        });

        this.container.append(thetree)

    }

    clear() {
        this.container.html("")
    }

    static name() {
        return 'varlist';
    }
    static display_name() {
        return 'Variable List';
    }

    static icon_path() {
        return 'assets/img/treelist-96x128.png';
    }

    static css_list() {
        return ['varlist.css']
    }
}