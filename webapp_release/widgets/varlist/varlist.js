class VarListWidget {

    constructor(container, app) {
        this.container = container
        this.app = app
    }

    initialize() {

        if (typeof(VarListWidget.next_instance_id) === 'undefined') {
            VarListWidget.next_instance_id = 0;
        } else {
            VarListWidget.next_instance_id++
        }
        this.instance_id = VarListWidget.next_instance_id
        this.treename = 'varlist_tree_' + this.instance_id

        let that = this

        this.container.html("");
        this.container.append($("<div class='tree-container'></div>"))

        // Event handlers
        $(document).on('scrutiny.datastore.ready', function() {
            that.rebuild_tree()
        })

        $(document).on('scrutiny.datastore.clear', function() {
            that.clear_tree()
        })

        $("#test_drop").on('drop', function(e) {
            e.preventDefault()

            $(this).text(e.originalEvent.dataTransfer.getData('display_path'))
        })

        $("#test_drop").on('dragover', function(e) {
            e.preventDefault()
        })




        // Setup
        if (this.app.datastore.is_ready()) {
            this.rebuild_tree()
        } else {}
    }

    make_node_id(display_path) {
        return this.treename + '_' + display_path.replaceAll('/', '_')
    }


    fetch_jstree_subnodes(parent, callback) {
        // jstree root has id="#"

        let node_type_map = {}
        node_type_map[DatastoreEntryType.Var] = 'var'
        node_type_map[DatastoreEntryType.Alias] = 'alias'
        node_type_map[DatastoreEntryType.Did] = 'did'


        let that = this
        if (parent.id == "#") {
            let display_path = '/'
            callback([{
                "text": "/",
                "id": that.make_node_id(display_path),
                "children": true,
                'li_attr': {
                    "display_path": display_path
                }
            }]);
        } else {
            let children = this.app.datastore.get_children(parent.li_attr.display_path)
            let jstree_childrens = []
                // Add folders node
            children['subfolders'].forEach(function(subfolder, i) {
                let separator = (parent.li_attr.display_path === "/") ? "" : "/"
                let display_path = parent.li_attr.display_path + separator + subfolder.name
                jstree_childrens.push({
                    'text': subfolder.name,
                    'children': subfolder.children, // true if it has children
                    'id': that.make_node_id(display_path),
                    'li_attr': {
                        "display_path": display_path
                    }
                })
            })

            // Add entries node
            Object.keys(DatastoreEntryType).forEach(function(typeval, i) {
                let entry_type = DatastoreEntryType[typeval]
                    // Entries are organized by entry type
                children['entries'][entry_type].forEach(function(entry, i) {
                    let display_path = entry.display_path
                    jstree_childrens.push({
                        'text': entry.name,
                        'id': that.make_node_id(display_path),
                        'li_attr': {
                            "display_path": display_path
                        },
                        "type": node_type_map[entry_type]
                    })
                })
            })

            callback(jstree_childrens) // This callback adds the subnodes
        }
    }

    get_tree_container() {
        return this.container.find('.tree-container');
    }


    // called on datastore ready event
    rebuild_tree() {
        this.clear_tree()

        let tree_name = 'varlist' + this.instance_id;
        let that = this
        let ds = this.app.datastore

        let thetree = $("<div class='varlist-tree'></div>").jstree({
            'plugins': ["dnd", "types"], // Drag and drop
            'core': {
                'data': function(obj, cb) {
                    that.fetch_jstree_subnodes(obj, cb)
                },
                'animation': 75,
                'themes': {
                    "variant": "small"
                }
            },
            "types": {
                "alias": {
                    "icon": "assets/img/alias-16x16.png"
                },
                'var': {
                    "icon": "assets/img/var-16x16.png"
                },
                "did": {
                    "icon": "assets/img/did-16x16.png"
                }
            },
        });

        // Open root on load complete.
        let root_node_id = this.make_node_id('/')
        thetree.bind("loaded.jstree", function() {
            thetree.jstree().open_node(root_node_id)
        });

        this.get_tree_container().append(thetree)

    }

    // called on datastore clear event
    clear_tree() {
        this.get_tree_container().html("")
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

    static templates() {
        return {
            'miaou' : 'templates/entry_type_filter.html'
        }
    }
}