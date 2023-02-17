import { BaseWidget } from "@src/base_widget"
import { App } from "@src/app"
import * as logging from "@src/logging"
import { default as $ } from "@jquery"
import { number2str } from "@src/tools"
import { XAxisType, TriggerType, DataloggingSamplingRate } from "@src/server_api"

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
        const that = this
        const config_overlay = this.app.get_template(this, "config_overlay") as JQuery<HTMLDivElement>
        const form_pane = this.app.get_template(this, "config_form_pane") as JQuery<HTMLDivElement>
        config_overlay.find(".pane-right").append(form_pane)
        this.container.append(config_overlay)
        this.update_config_capabilities()

        this.app.on_event("scrutiny.datalogging_capabilities_changed", function () {
            that.update_config_capabilities()
        })

        this.app.on_event("scrutiny.device.disconnected", function () {
            that.update_config_capabilities()
        })

        this.get_config_table()
            .find("select")
            .on("change", function () {
                that.update_config_form()
            })
    }

    set_config_no_datalogging() {
        this.get_sampling_rate_select().html("<option>N/A</option>")
        this.get_xaxis_type_select().find('option[value="ideal_time"]').attr("disabled", "disabled")
        this.set_effective_sampling_rate("N/A")
    }

    get_config_table(): JQuery<HTMLTableElement> {
        return this.container.find(".form-pane table") as JQuery<HTMLTableElement>
    }

    set_effective_sampling_rate(val: string | number) {
        this.get_config_table().find('input[name="effective_sampling_rate"]').val(val)
    }

    get_xaxis_type_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="xaxis_type"]') as JQuery<HTMLSelectElement>
    }

    get_sampling_rate_select(): JQuery<HTMLSelectElement> {
        return this.get_config_table().find('select[name="sampling_rate"]') as JQuery<HTMLSelectElement>
    }

    get_selected_sampling_rate(): DataloggingSamplingRate | null {
        const val = parseInt(this.get_sampling_rate_select().val() as string)
        if (isNaN(val)) {
            return null
        }

        if (this.app.server_conn.datalogging_capabilities == null) {
            return null
        }

        if (val >= this.app.server_conn.datalogging_capabilities.sampling_rates.length) {
            return null
        }

        return this.app.server_conn.datalogging_capabilities.sampling_rates[val]
    }

    update_config_capabilities() {
        const capabilities = this.app.server_conn.datalogging_capabilities
        if (capabilities == null) {
            this.set_config_no_datalogging()
        } else {
            let sr_select = this.get_sampling_rate_select()
            sr_select.html("") // Removes content
            for (let i = 0; i < capabilities.sampling_rates.length; i++) {
                let sr = capabilities.sampling_rates[i]
                let option = $("<option></option>")
                option.prop("value", sr.identifier)
                let sr_name = "<No name>"
                if (sr.name !== "") {
                    sr_name = sr.name
                }
                if (sr.type == "fixed_freq") {
                    option.text(number2str(sr.frequency as number, 3) + " Hz")
                } else if (sr.type == "variable_freq") {
                    option.text(`VF[${sr.identifier}] : ${sr_name}`)
                }
                sr_select.append(option)
            }
            sr_select.removeAttr("disabled")
        }

        this.update_config_form()
    }

    get_selected_xaxis_type(): XAxisType {
        return this.get_xaxis_type_select().val() as XAxisType
    }

    get_selected_trigger_type(): TriggerType {
        return this.get_config_table().find("select[name='trigger_type']").val() as TriggerType
    }

    update_config_form() {
        const selected_xaxis_type = this.get_selected_xaxis_type()
        const trigger_type = this.get_selected_trigger_type()
        if (selected_xaxis_type == "signal") {
            this.get_config_table().find(".line-xaxis-signal").show()
        } else {
            this.get_config_table().find(".line-xaxis-signal").hide()
        }

        const nb_operands_map: Record<TriggerType, number> = {
            true: 0,
            eq: 2,
            neq: 2,
            lt: 2,
            let: 2,
            gt: 2,
            get: 2,
            cmt: 2,
            within: 3,
        }

        const nb_operands = nb_operands_map[trigger_type]
        const operand1 = this.get_config_table().find(".line-operand1") as JQuery<HTMLTableRowElement>
        const operand2 = this.get_config_table().find(".line-operand2") as JQuery<HTMLTableRowElement>
        const operand3 = this.get_config_table().find(".line-operand3") as JQuery<HTMLTableRowElement>

        if (nb_operands >= 1) {
            operand1.show()
        } else {
            operand1.hide()
        }

        if (nb_operands >= 2) {
            operand2.show()
        } else {
            operand2.hide()
        }

        if (nb_operands >= 3) {
            operand3.show()
        } else {
            operand3.hide()
        }

        let sampling_rate = this.get_selected_sampling_rate()
        if (sampling_rate !== null) {
            const ideal_time_option = this.get_xaxis_type_select().find("option[value='ideal_time']")
            if (sampling_rate.type == "variable_freq") {
                if (selected_xaxis_type == "ideal_time") {
                    this.get_xaxis_type_select().find("option[value='measured_time']").prop("selected", "selected")
                } else {
                    console.log("No " + selected_xaxis_type)
                }
                ideal_time_option.attr("disabled", "disabled")
            } else {
                ideal_time_option.removeAttr("disabled")
            }

            let decimation = this.get_config_table().find("input[name='decimation']").val()
            decimation = parseInt(decimation as string)
            if (isNaN(decimation)) {
                decimation = 0
            }

            if (decimation > 0 && sampling_rate.type == "fixed_freq") {
                this.set_effective_sampling_rate((sampling_rate.frequency as number) / decimation)
            } else {
                this.set_effective_sampling_rate("N/A")
            }
        }
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
