
export class WatchWidget {
    
    /* TODO :
        - Stop watching when tab is not visible to free bandwidth on device link which may be slow and increase refresh rate of other vars    
        - Easy value edit
        - Multi selection
        - Property view (edition?)
        - Tree view
        - Rename variables
        - resize table
        - Display hex value
     */

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

        if (typeof(WatchWidget.next_instance_id) === 'undefined') {
            WatchWidget.next_instance_id = 0;
        } else {
            WatchWidget.next_instance_id++
        }
        this.instance_id = WatchWidget.next_instance_id
        this.next_line_instance = 0

        // todo : remove event handler on tabl close?
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


        // todo : remove event handler on tabl close?
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

        $(document).on('keydown', function(e) {
            if (e.key === "Delete") {
                // Remove selected lines
                $('table.watch-display tr.selected').each(function(){
                    that.remove_var($(this))
                })
            }
        })
    }

    destroy(){
        // Remove all lines even if not selected
        $('table.watch-display tr').each(function(){
            that.remove_var($(this))
        })
    }

    get_widget_name(){
        return "WatchWidget" + this.instance_id
    }

    get_line_id(instance){
        return this.get_widget_name()+'_line_' + instance
    }

    add_var(display_path){
        let line = $('<tr></tr>')
        let line_instance = this.next_line_instance++;
        let line_id = this.get_line_id(line_instance);
        line.attr('id', line_id)
        line.attr('display_path', display_path)
        line.append('<td>'+display_path+'</td>')
        line.append('<td class="value-cell"><span>0.0</span></td>')
        line.append('<td class="help-cell"><img src="assets/img/question-mark-grey-64x64.png" /></td>')

        // Homemade selector logic for now. Todo: Do something more fancy
        line.click(function(){
            let temp = true;
            if (line.hasClass('selected')){
                temp=false;
            }

            $('table.watch-display tr').removeClass('selected')
           
            if (temp){
                line.addClass('selected')
            }
            else{
                line.removeClass('selected')
            }
        })
    
        this.display_table.first('tbody').append(line)

        let update_callback = function(val){
            if (val === null){
                val = 'N/A'
            }
            line.find('.value-cell span').text(val)
        }
        update_callback(this.app.datastore.get_value(display_path))
        this.app.datastore.watch(display_path, line_id, update_callback)
    }

    remove_var(line){
        let line_id = line.attr('id')
        this.app.datastore.unwatch_all(line_id)
        line.remove()
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