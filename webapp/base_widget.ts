//    base_widget.ts
//        An interface for all widget classes
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { App } from "./app"

/**
 * Represent the interface for any Widget that can be added to the UI
 */
export class BaseWidget {
    constructor(container: JQuery<HTMLDivElement>, app: App, instance_id: number) {}

    /**
     * Initialize the instance of the widget when a new instance is created in the UI
     */
    initialize() {
        throw "Not implemented"
    }

    /**
     * Destroy the instance of the widget when it is closed in the UI
     */
    destroy() {
        throw "Not implemented"
    }

    /**
     * Returns a unique name for the instance of this widget
     */
    get_instance_name() {
        throw "Not implemented"
    }

    /**
     * Returns the name of the widget
     */
    static widget_name(): string {
        throw "Not implemented"
    }

    /**
     * Returns a nice name to display on the screen to identify this widget
     */
    static display_name(): string {
        throw "Not implemented"
    }

    /**
     * Returns the path of the icon of tht widget
     */
    static icon_path(): string {
        throw "Not implemented"
    }

    /**
     * The list of CSS files required for this widget
     */
    static css_list(): string[] {
        throw "Not implemented"
    }

    /**
     * The list of template files required for this widget
     */
    static templates(): Record<string, string> {
        throw "Not implemented"
    }
}
