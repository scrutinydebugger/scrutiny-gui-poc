class WatchWidget {

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
                        dropzone.append($("<div></div>").text(display_path))
                    })
                }
            }
        });
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
        return []
    }

    static templates() {
        return {}
    }
}