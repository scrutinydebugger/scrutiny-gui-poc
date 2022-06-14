class WatchWidget {

    constructor(container, server_conn, datastore) {
        this.container = container
        this.server_conn = server_conn
        this.datastore = datastore
    }

    initialize() {
        this.container.html('<h2 style="text-align:center">Watch!</h2>');
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
}