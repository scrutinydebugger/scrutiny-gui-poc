export class WatchWidget {

    constructor(container, app) {
        this.container = container
        this.app = app
    }

    initialize() {
        let that = this
        let block = $("<div></div>")
        block.addClass('watch-drop-zone')
        block.css('height', '100%')
        block.css('width', '100%')
        this.container.append(block);
        let display_table = this.app.get_template(this, 'display_table')
        block.append(display_table)
        this.display_table = display_table
        

        $(document).on('dnd_move.vakata', function(e, data) {
            var t = $(data.event.target);
            if (!t.closest('.jstree').length) {
                if (t.closest('.watch-drop-zone').length) {
                    data.helper.find('.jstree-icon').removeClass('jstree-er').addClass('jstree-ok');
                } else {
                    data.helper.find('.jstree-icon').removeClass('jstree-ok').addClass('jstree-er');
                }
            }
        })

        $(document).on('dnd_stop.vakata', function(e, data) {
            var t = $(data.event.target);
            let dropzone = t.closest('.watch-drop-zone').first()
            if (dropzone.length) {
                if (that.container.has(dropzone).length) { // Make sure we only take our event. Not the one from other watch window.
                    $(data.data.nodes).each(function(i, nodeid) { // For each dragged node
                        let display_path = $("#" + nodeid).attr('display_path')
                        that.add_var(display_path)
                    })
                }
            }
        });

        $(document).on('scrutiny.value_update', function(e){

        });
    }

    add_var(display_path){
        let line = $('<tr></tr>')
        line.append('<td>'+display_path+'</td>')
        line.append('<td class="value-cell"><span>0.0</span></td>')

        this.display_table.first('tbody').append(line)

        this.start_watching(display_path)
    }


    start_watching(display_path){
        this.app.datastore.register_watcher(display_path, this)
    }

    stop_watching(display_path){
        this.app.datastore.unregister_watcher(display_path, this)
    }

    static name() {
        return 'watch';
    }
    static display_name() {
        return 'Watch Window';
    }

    static icon_path() {
        return 'assets/img/eye-96x128.png';
    }

    static css_list() {
        return ['watch.css']
    }

    static templates() {
        return {
            'display_table' : 'templates/display_table.html'
        }
    }
}