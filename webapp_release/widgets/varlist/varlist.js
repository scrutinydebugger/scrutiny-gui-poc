import { DatastoreEntryType, AllDatastoreEntryTypes} from "/js/global_definitions.js"

export class VarListWidget {

    constructor(container, app, instance_id) {
        this.container = container
        this.app = app
        this.instance_id = instance_id
    }

    initialize() {
        let that = this
        this.treename = 'varlist_tree_' + this.instance_id
        this.id_map = {}
        this.next_tree_id=0;
        
        this.container.html(this.app.get_template(this, 'varlist-content'));

        // Event handlers
        $(document).on('scrutiny.datastore.ready', function(data) {
            that.rebuild_tree(data['entry_type'])
        })

        $(document).on('scrutiny.datastore.clear', function(data) {
            that.rebuild_tree(data['entry_type'])
        })

        // Setup
        for (let i=0; i<AllDatastoreEntryTypes.length; i++){
            if (this.app.datastore.is_ready(AllDatastoreEntryTypes[i])) {
                this.rebuild_tree(AllDatastoreEntryTypes[i])
            } else {}
        }

        setTimeout(function(){
            that.rebuild_tree()
        })
    }

    destroy(){

    }

    make_node_id(display_path) {
        if (!this.id_map.hasOwnProperty(display_path))
        {
            this.id_map[display_path] = this.next_tree_id
            this.next_tree_id++ 
        }
        return this.treename + '_' + this.id_map[display_path]
    }

    fetch_jstree_subnodes(parent, callback) {
        // jstree root has id="#"

        let node_type_map = {}
        node_type_map[DatastoreEntryType.Var] = 'var'
        node_type_map[DatastoreEntryType.Alias] = 'alias'
        node_type_map[DatastoreEntryType.RPV] = 'rpv'

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
            let jstree_childrens = []

            for (let i=0; i<AllDatastoreEntryTypes.length; i++)
            {
                let entry_type = AllDatastoreEntryTypes[i];
                let children = this.app.datastore.get_children(entry_type, parent.li_attr.display_path)
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

                // Entries are organized by entry type
                children['entries'][entry_type].forEach(function(entry, i) {
                    jstree_childrens.push({
                        'text': entry.name,
                        'id': that.make_node_id(entry.display_path),
                        'li_attr': {
                            "display_path": entry.display_path,
                            "type" : entry.entry_type
                        },
                        "type": node_type_map[entry_type]
                    })
                })
            }
                
            // Add entries node

            callback(jstree_childrens) // This callback adds the subnodes
        }
    }

    get_tree_container() {
        return this.container.find('.varlist-tree-container');
    }


    // called on datastore ready event
    rebuild_tree(entry_type) {
        this.clear_tree(entry_type)

        let that = this
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
                "rpv": {
                    "icon": "assets/img/rpv-16x16.png"
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
    clear_tree(entry_type) {
        // nothing to do with type as we have a single tree for them all.
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
            'varlist-content' : 'templates/varlist-content.html'
        }
    }
}
