import { BaseWidget } from "@src/base_widget"
import { App } from "@src/app"
import * as logging from "@src/logging"
import { default as $ } from "@jquery"

type JQueryRow = JQuery<HTMLTableRowElement>
type JQueryTable = JQuery<HTMLTableElement>
type JQueryCell = JQuery<HTMLTableCellElement>
type LiveEditCompleteCallback = (val: string) => void

export class GraphWidget extends BaseWidget {
    container: JQuery
    /** The Scrutiny App instance */
    app: App
    /** The instance ID of this widget. */
    instance_id: number
    /** Logger element */
    logger: logging.Logger

    /**
     *
     * @param container HTML container object in which to append the widget content
     * @param app The Scrutiny App instance
     * @param instance_id A unique instance number for this widget
     */
    constructor(container: JQuery<HTMLDivElement>, app: App, instance_id: number) {
        super(container, app, instance_id)
        this.container = container
        this.app = app
        this.instance_id = instance_id

        this.logger = logging.getLogger(this.constructor.name)
    }

    /**
     * Initialize the widget
     */
    initialize() {
        let that = this
        let config_overlay = this.app.get_template(this, "config_overlay") as JQuery<HTMLDivElement>
        let form_pane = this.app.get_template(this, "config_form_pane") as JQuery<HTMLDivElement>
        config_overlay.find(".pane-right").append(form_pane)
        this.container.append(config_overlay)
    }

    destroy() {}

    static widget_name() {
        return "graph"
    }
    static display_name() {
        return "Graph Viewer"
    }

    static icon_path() {
        return "assets/img/graph-96x128.png"
    }

    static css_list() {
        return ["graph.css"]
    }

    static templates() {
        return {
            config_overlay: "templates/config_overlay.html",
            config_form_pane: "templates/config_form_pane.html",
        }
    }
}
