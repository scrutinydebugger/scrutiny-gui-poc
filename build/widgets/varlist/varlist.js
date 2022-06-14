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

    }

    update_from_datastore() {
        this.container.html("")

        let tree = $("<ul></ul>")
        tree.addClass('varlist-tree')

        let entries = this.datastore.get_entries(DatastoreEntryType.Var)

        for (let i = 0; i < entries.length; i++) {
            let node = $("<li></li>")
            node.addClass('varlist-tree-node')
            node.text(entries[i].display_path)
            tree.append(node)
        }
        this.container.append(tree)
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