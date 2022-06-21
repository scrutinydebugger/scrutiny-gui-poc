class Tree {

    constructor() {
        this.datastruct = {
            'nodes': {},
            'subtrees': {}
        }
    }

    get_segments(path, has_name = true) {
        let output = {
            'segments': []
        }
        let segments = trim(path, '/').split('/')
        let nodename = ""
        segments = segments.filter(s => s !== "")

        if (has_name) {
            nodename = segments.pop()
            if (nodename === "") {
                throw "Empty node name"
            }
            output['name'] = nodename
        }
        output['segments'] = segments

        return output
    }

    add(path, obj) {
        let target = this.get_segments(path)
        let actual_branch = this.datastruct;
        for (let i = 0; i < target['segments'].length; i++) {
            let segment = target['segments'][i];
            if (!actual_branch['subtrees'].hasOwnProperty(segment)) {
                actual_branch['subtrees'][segment] = {
                    'nodes': {},
                    'subtrees': {}
                }
            }
            actual_branch = actual_branch['subtrees'][segment];
        }

        actual_branch['nodes'][target['name']] = obj
    }


    get_obj(path) {
        let error_str = "" + path + " does not exist in the tree"
        let target = this.get_segments(path)

        let actual_branch = this.datastruct;
        for (let i = 0; i < target['segments'].length; i++) {
            let segment = target['segments'][i];
            if (!actual_branch['subtrees'].hasOwnProperty(segment)) {
                throw error_str
            }
            actual_branch = actual_branch['subtrees'][segment];
        }
        if (!actual_branch['nodes'].hasOwnProperty(target['name'])) {
            throw error_str
        }

        return actual_branch['nodes'][target['name']]
    }

    get_children(path) {
        let children = {
            'nodes': {},
            'subtrees': {}
        }
        let error_str = "" + path + " does not exist in the tree"
        let target = this.get_segments(path, false) // false means no name

        let actual_branch = this.datastruct;
        for (let i = 0; i < target['segments'].length; i++) {
            let segment = target['segments'][i];
            if (!actual_branch['subtrees'].hasOwnProperty(segment)) {
                throw error_str
            }
            actual_branch = actual_branch['subtrees'][segment];
        }

        let subtree_names = Object.keys(actual_branch['subtrees'])
        children['nodes'] = actual_branch['nodes']
        let subtrees = {}
        subtree_names.forEach(function(elem, index) {

            subtrees[elem] = {
                'has_nodes': Object.keys(actual_branch['subtrees'][elem]['nodes']).length > 0,
                'has_subtrees': Object.keys(actual_branch['subtrees'][elem]['subtrees']).length > 0
            }
        })

        children['subtrees'] = subtrees

        return children
    }
}