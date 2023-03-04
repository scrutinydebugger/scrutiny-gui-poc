//    ui.ts
//        User interface module that can take the application data and assign it to the correct
//        DOM element.
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { ServerStatus, DeviceStatus, DataloggerState } from "./global_definitions"
import { default as $ } from "@jquery"
import { DeviceInformation, ScrutinyFirmwareDescription, Datalogging } from "./server_api"
import { BaseWidget } from "./base_widget"
import { App } from "./app"
import { cancel_all_live_edit } from "@scrutiny-live-edit"

type GoldenLayout = any // Stub for external lib

export function configure_all_tooltips(jObj: JQuery) {
    configure_tooltip(jObj.find("div.scrutiny-tooltip-container") as JQuery<HTMLDivElement>)
}

export function configure_tooltip(containers: JQuery<HTMLDivElement>) {
    containers.find(".scrutiny-tooltip-hover").on("mouseover", function (ev: JQuery.MouseOverEvent) {
        $(this).parent().find(".scrutiny-tooltip-content").show()
    })

    containers.find(".scrutiny-tooltip-hover").on("mouseleave", function (ev: JQuery.MouseLeaveEvent) {
        $(this).parent().find(".scrutiny-tooltip-content").hide()
    })
}

export class UI {
    container: JQuery<HTMLDivElement>
    widget_layout: GoldenLayout
    indicator_lights: Record<string, string>
    loaded_sfd: ScrutinyFirmwareDescription | null
    loaded_sfd_id: string | null
    device_info: DeviceInformation | null
    datalogging_capabilities: Datalogging.Capabilities | null

    constructor(container: JQuery<HTMLDivElement>) {
        let config = {
            content: [],
        }
        this.container = container
        //@ts-ignore
        this.widget_layout = new GoldenLayout(config, container)
        this.widget_layout.on("itemDestroyed", function (component: any) {
            if (component.type === "component") {
                let widget = component.instance // instance is the object returned by the callback in registerComponent
                widget.destroy()
            }
        })

        this.widget_layout.on("componentCreated", function (component: any) {
            component.container.on("resize", function () {
                let widget = component.instance
                widget.resize()
            })
        })

        this.indicator_lights = {
            red: "assets/img/indicator-red.png",
            yellow: "assets/img/indicator-yellow.png",
            green: "assets/img/indicator-green.png",
            grey: "assets/img/indicator-grey.png",
        }

        this.loaded_sfd = null
        this.loaded_sfd_id = null
        this.device_info = null
        this.datalogging_capabilities = null
    }

    /**
     * Initialize the UI
     */
    init(): void {
        this.widget_layout.init()
        const that = this
        $(window).on("resize", function () {
            that.resize()
        })
        this.resize()

        $("#modal-close-btn").on("click", function () {
            $("#modal-container").hide()
        })

        $(document).on("keyup", function (e: JQuery.KeyUpEvent) {
            if (e.key == "Escape") {
                $("#modal-container").hide()
                $(".scrutiny-tooltip-content").hide()
                cancel_all_live_edit()
            }
        })

        $("#loaded_firmware_label").on("click", function () {
            that.show_firmware_info()
        })

        $("#device_status_label").on("click", function () {
            that.show_device_info()
        })
    }

    /**
     * Resize the window and recompute components sizes
     */
    resize() {
        if (typeof window == "undefined") {
            throw "Cannot resize. No window"
        }
        const $window = $(window)
        const golden_layout_margin = 2
        const sidemenu = $("#sidemenu") as JQuery<HTMLDivElement>
        const menubar_height = $("#menubar").outerHeight() as number
        const statusbar_height = $("#statusbar").outerHeight() as number
        const sidemenu_width = sidemenu.outerWidth() as number
        const sidemenu_height = ($window.height() as number) - menubar_height - statusbar_height

        let golden_layout_width = ($window.width() as number) - sidemenu_width - golden_layout_margin
        $("#sidemenu").outerHeight(sidemenu_height)
        $("#sidemenu").css("top", menubar_height)
        $("#menubar_corner_filler").outerWidth(sidemenu_width)
        this.container.outerWidth(golden_layout_width - 2 * golden_layout_margin)
        this.container.outerHeight(sidemenu_height - 2 * golden_layout_margin)
        this.container.css("top", menubar_height + golden_layout_margin)
        this.container.css("left", sidemenu_width + golden_layout_margin)
        this.widget_layout.updateSize(this.container.width(), this.container.height())
    }

    /**
     * Show a modal window in the UI
     * @param title Window title
     * @param content Content of the window
     */
    show_modal(title: string, content: JQuery) {
        $("#modal-content").empty()
        $("#modal-window-title").text(title)
        $("#modal-content").append(content)
        $("#modal-container").show()
        let header_height = $("#modal-window-header").height() as number
        let img_height = $("#modal-close-btn").outerHeight() as number
        let button_margin = Math.round((header_height - img_height) / 2)
        $("#modal-close-btn").css("margin-top", "" + button_margin + "px")
    }

    /**
     * Show the Scrutiny Firmware Description (SFD) file content in a modal window
     */
    show_firmware_info() {
        let padLeft = function (s: string, ch: string, n: number) {
            return s.length >= n ? s : (Array(n + 1).join(ch) + s).slice(-n)
        }

        if (this.loaded_sfd != null) {
            let project_name = "-"
            let version = "-"
            let author = "-"
            let firmware_id = "-"
            let generated_on = "-"
            let generated_with = "-"

            try {
                project_name = this.loaded_sfd["metadata"]["project_name"]
            } catch (err) {}

            try {
                version = this.loaded_sfd["metadata"]["version"]
            } catch (err) {}

            try {
                author = this.loaded_sfd["metadata"]["author"]
            } catch (err) {}

            try {
                firmware_id = this.loaded_sfd["firmware_id"]
            } catch (err) {}

            try {
                let timestamp = this.loaded_sfd["metadata"]["generation_info"]["time"]
                let date = new Date(timestamp * 1000) // timestamp in milliseconds

                let year = String(date.getFullYear())
                let month = padLeft(String(date.getMonth() + 1), "0", 2)
                let day = padLeft(String(date.getDate()), "0", 2)
                let hours = padLeft(String(date.getHours()), "0", 2)
                let minutes = padLeft(String(date.getMinutes()), "0", 2)
                let seconds = padLeft(String(date.getSeconds()), "0", 2)

                generated_on = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
            } catch (err) {}

            try {
                let python_version = this.loaded_sfd["metadata"]["generation_info"]["python_version"]
                let scrutiny_version = this.loaded_sfd["metadata"]["generation_info"]["scrutiny_version"]
                let system_type = this.loaded_sfd["metadata"]["generation_info"]["system_type"]
                generated_with = `Scrutiny V${scrutiny_version} & Python V${python_version} on ${system_type}`
            } catch (err) {}

            this.show_modal("Firmware details", $($("#template-firmware-details-table").html()))
            $("#modal-content td[label-name='project-name']").text(project_name)
            $("#modal-content td[label-name='version']").text(version)
            $("#modal-content td[label-name='author']").text(author)
            $("#modal-content td[label-name='firmware_id']").text(firmware_id)
            $("#modal-content td[label-name='generated-on']").text(generated_on)
            $("#modal-content td[label-name='generated-with']").text(generated_with)
        }
    }

    /**
     * Show the device information gotten from the ServerConnection into a modal window
     */
    show_device_info() {
        let padLeft = function (s: string, ch: string, n: number) {
            return s.length >= n ? s : (Array(n + 1).join(ch) + s).slice(-n)
        }

        if (this.device_info != null) {
            let device_id = "-"
            let display_name = "-"
            let max_tx_data_size = "-"
            let max_rx_data_size = "-"
            let max_bitrate_bps = "-"
            let rx_timeout_us = "-"
            let heartbeat_timeout_us = "-"
            let address_size_bits = "-"
            let protocol_version = "-"
            let supported_feature_map_content: JQuery | string = "-"
            let readonly_memory_regions_content: JQuery | string = "-"
            let forbidden_memory_regions_content: JQuery | string = "-"
            let datalogging_capabilities_content: JQuery | string = "-"

            try {
                device_id = this.device_info["device_id"]
            } catch (err) {}

            try {
                display_name = this.device_info["display_name"]
            } catch (err) {}

            try {
                max_tx_data_size = this.device_info["max_tx_data_size"] + " bytes"
            } catch (err) {}

            try {
                max_rx_data_size = this.device_info["max_rx_data_size"] + " bytes"
            } catch (err) {}

            try {
                max_bitrate_bps = this.device_info["max_bitrate_bps"] + " b/s"
            } catch (err) {}

            try {
                rx_timeout_us = this.device_info["rx_timeout_us"] + " us"
            } catch (err) {}

            try {
                heartbeat_timeout_us = this.device_info["heartbeat_timeout_us"] + " us"
            } catch (err) {}

            try {
                address_size_bits = this.device_info["address_size_bits"] + " bits"
            } catch (err) {}

            try {
                let major = this.device_info["protocol_major"]
                let minor = this.device_info["protocol_minor"]
                protocol_version = `V${major}.${minor}`
            } catch (err) {}

            try {
                supported_feature_map_content = $("<ul></ul>") as JQuery<HTMLUListElement>
                supported_feature_map_content.append(
                    $("<li>Memory Read : " + (this.device_info["supported_feature_map"]["memory_read"] ? "Yes" : "No") + " </li>")
                )
                supported_feature_map_content.append(
                    $("<li>Memory Write : " + (this.device_info["supported_feature_map"]["memory_write"] ? "Yes" : "No") + " </li>")
                )
                supported_feature_map_content.append(
                    $("<li>Datalogging: " + (this.device_info["supported_feature_map"]["datalogging"] ? "Yes" : "No") + " </li>")
                )
                supported_feature_map_content.append(
                    $("<li>User command: " + (this.device_info["supported_feature_map"]["user_command"] ? "Yes" : "No") + " </li>")
                )
                supported_feature_map_content.append(
                    $("<li>64bits support: " + (this.device_info["supported_feature_map"]["_64bits"] ? "Yes" : "No") + " </li>")
                )
                supported_feature_map_content.addClass("list-no-margin")
            } catch (err) {
                supported_feature_map_content = "-"
            }

            try {
                const address_size_bytes = Math.round(this.device_info["address_size_bits"] / 8)
                if (this.device_info["readonly_memory_regions"].length == 0) {
                    readonly_memory_regions_content = "None"
                } else {
                    readonly_memory_regions_content = $("<ul></ul>") as JQuery
                    for (let i = 0; i < this.device_info["readonly_memory_regions"].length; i++) {
                        const start = this.device_info["readonly_memory_regions"][i]["start"]
                        const end = this.device_info["readonly_memory_regions"][i]["end"]
                        const display_str =
                            "0x" +
                            padLeft(start.toString(16), "0", address_size_bytes) +
                            " - 0x" +
                            padLeft(end.toString(16), "0", address_size_bytes)
                        readonly_memory_regions_content.append($("<li>" + display_str + "</li>"))
                    }
                    readonly_memory_regions_content.addClass("list-no-margin")
                }
            } catch (err) {
                readonly_memory_regions_content = "-"
            }

            try {
                const address_size_bytes = Math.round(this.device_info["address_size_bits"] / 8)
                if (this.device_info["forbidden_memory_regions"].length == 0) {
                    forbidden_memory_regions_content = "None"
                } else {
                    forbidden_memory_regions_content = $("<ul></ul>") as JQuery
                    for (let i = 0; i < this.device_info["forbidden_memory_regions"].length; i++) {
                        const start = this.device_info["forbidden_memory_regions"][i]["start"]
                        const end = this.device_info["forbidden_memory_regions"][i]["end"]
                        const display_str =
                            "0x" +
                            padLeft(start.toString(16), "0", address_size_bytes) +
                            " - 0x" +
                            padLeft(end.toString(16), "0", address_size_bytes)
                        forbidden_memory_regions_content.append($("<li>" + display_str + "</li>"))
                    }
                    forbidden_memory_regions_content.addClass("list-no-margin")
                }
            } catch (err) {
                forbidden_memory_regions_content = "-"
            }

            try {
                if (this.datalogging_capabilities == null) {
                    datalogging_capabilities_content = "-"
                } else {
                    datalogging_capabilities_content = $("<ul></ul>") as JQuery<HTMLUListElement>
                    datalogging_capabilities_content.append(
                        $("<li>Buffer Size : " + this.datalogging_capabilities["buffer_size"] + " bytes </li>")
                    )
                    datalogging_capabilities_content.append($("<li>Encoding : " + this.datalogging_capabilities["encoding"] + " </li>"))
                    datalogging_capabilities_content.append(
                        $("<li>Max signal : " + this.datalogging_capabilities["max_nb_signal"] + " </li>")
                    )

                    let ff_sampling_rates_count = 0
                    let vf_sampling_rates_count = 0
                    for (let i = 0; i < this.datalogging_capabilities["sampling_rates"].length; i++) {
                        if (this.datalogging_capabilities["sampling_rates"][i]["type"] == "fixed_freq") {
                            ff_sampling_rates_count++
                        } else if (this.datalogging_capabilities["sampling_rates"][i]["type"] == "variable_freq") {
                            vf_sampling_rates_count++
                        }
                    }
                    datalogging_capabilities_content.append($("<li>Fixed sampling rates : " + ff_sampling_rates_count + " </li>"))
                    datalogging_capabilities_content.append($("<li>Variable sampling rate : " + vf_sampling_rates_count + " </li>"))
                    datalogging_capabilities_content.addClass("list-no-margin")
                }
            } catch (e) {
                datalogging_capabilities_content = "-"
            }

            this.show_modal("Device Information", $($("#template-device-info-table").html()))
            $("#modal-content [label-name='device_id']").text(device_id)
            $("#modal-content [label-name='display_name']").text(display_name)
            $("#modal-content [label-name='max_tx_data_size']").text(max_tx_data_size)
            $("#modal-content [label-name='max_rx_data_size']").text(max_rx_data_size)
            $("#modal-content [label-name='max_bitrate_bps']").text(max_bitrate_bps)
            $("#modal-content [label-name='rx_timeout_us']").text(rx_timeout_us)
            $("#modal-content [label-name='heartbeat_timeout_us']").text(heartbeat_timeout_us)
            $("#modal-content [label-name='address_size_bits']").text(address_size_bits)
            $("#modal-content [label-name='protocol_version']").text(protocol_version)

            $("#modal-content td[label-name='supported_feature_map']").html(
                typeof supported_feature_map_content === "string" ? supported_feature_map_content : supported_feature_map_content[0]
            )
            $("#modal-content td[label-name='readonly_memory_regions']").html(
                typeof readonly_memory_regions_content === "string" ? readonly_memory_regions_content : readonly_memory_regions_content[0]
            )
            $("#modal-content td[label-name='forbidden_memory_regions']").html(
                typeof forbidden_memory_regions_content === "string"
                    ? forbidden_memory_regions_content
                    : forbidden_memory_regions_content[0]
            )

            $("#modal-content td[label-name='datalogging']").html(
                typeof datalogging_capabilities_content === "string"
                    ? datalogging_capabilities_content
                    : datalogging_capabilities_content[0]
            )

            configure_all_tooltips($("#modal-content"))
        }
    }

    /**
     * Register a widget to the UI. Its icon will be shown in the widget menu
     * @param widget_class Widget class to add
     * @param app The Scrutiny application instance
     */
    register_widget(widget_class: typeof BaseWidget, app: App) {
        const that = this
        ;(function (): void {
            let instance_id = 0

            // Adds a callback to create the instance of the widget
            that.widget_layout.registerComponent(widget_class.widget_name(), function (container: any, state: any) {
                instance_id++
                const scrutiny_widget_container = $("<div>").addClass("scrutiny-widget-container") as JQuery<HTMLDivElement>
                const golden_layout_container = $(container.getElement()).append(scrutiny_widget_container)
                golden_layout_container.css("overflow", "auto")
                golden_layout_container.on("resize", function () {
                    console.log("resize golden_layout_container")
                })
                golden_layout_container.on("stateChanged", function () {
                    console.log("stateChanged golden_layout_container")
                })

                scrutiny_widget_container.on("resize", function () {
                    console.log("resize scrutiny_widget_container")
                })
                const widget = new widget_class(scrutiny_widget_container, app, instance_id)
                widget.initialize()
                return widget
            })
        })()

        // Add menu item for drag and drop
        const div = $("<div></div>")
        div.addClass("widget_draggable_item")

        const img = $("<img/>")
        img.attr("src", widget_class.icon_path())
        img.attr("width", "64px")
        img.attr("height", "48px")

        const label = $("<span></span>")
        label.addClass("widget_draggable_label")
        label.text(widget_class.display_name())

        div.append(img)
        div.append(label)

        $("#sidemenu").append(div)
        $("#sidemenu").append($('<div class="horizontal_separator"></div>'))

        const newItemConfig = {
            title: widget_class.display_name(),
            type: "component",
            componentName: widget_class.widget_name(),
            componentState: {},
        }

        this.widget_layout.createDragSource(div, newItemConfig)
    }

    /**
     * Sets the status of the server. Data is provided by the ServerConnection
     * @param status The server status
     */
    set_server_status(status: ServerStatus) {
        let new_text = ""
        if (status == ServerStatus.Disconnected) {
            new_text = "Disconnected"
            $("#server_status .indicator").attr("src", this.indicator_lights["red"])
        } else if (status == ServerStatus.Connecting) {
            new_text = "Connecting"
            $("#server_status .indicator").attr("src", this.indicator_lights["yellow"])
        } else if (status == ServerStatus.Connected) {
            new_text = "Connected"
            $("#server_status .indicator").attr("src", this.indicator_lights["green"])
        } else {
            new_text = "Unknown"
            $("#server_status .indicator").attr("src", this.indicator_lights["grey"])
        }
        const label = $("#server_status_label")
        if (label.text() !== new_text) {
            label.text(new_text)
        }
    }

    set_datalogging_status(status: DataloggerState, completion_ratio: number | null) {
        let new_text = "Unknown state"
        if (status == DataloggerState.Standby) {
            new_text = "Standby"
        } else if (status == DataloggerState.Acquiring) {
            new_text = "Acquiring"
        } else if (status == DataloggerState.WaitForTrigger) {
            new_text = "Wait For Tigger"
        } else if (status == DataloggerState.DataReady) {
            new_text = "Data Ready"
        } else if (status == DataloggerState.Error) {
            new_text = "Error"
        }

        if (completion_ratio !== null) {
            completion_ratio = Math.round(Math.min(Math.max(completion_ratio, 0), 1) * 100)
            const completion_ratio_str = completion_ratio.toFixed(0)
            new_text += ` (${completion_ratio_str}%)`
        }

        const label = $("#datalogger_state_label")
        if (label.text() !== new_text) {
            label.text(new_text)
        }
    }

    /**
     * Sets the device status in the UI. Data is provided by the ServerConnection
     * @param status Status of the device communication
     * @param device_info Device information gathered by the server
     */
    set_device_status(
        status: DeviceStatus,
        device_info: DeviceInformation | null,
        datalogging_capabilities: Datalogging.Capabilities | null
    ) {
        this.device_info = device_info
        this.datalogging_capabilities = datalogging_capabilities

        let status_label_text = ""
        let indicator_img = ""
        if (status == DeviceStatus.Disconnected) {
            status_label_text = "Disconnected"
            indicator_img = this.indicator_lights["red"]
        } else if (status == DeviceStatus.Connecting) {
            status_label_text = "Connecting"
            indicator_img = this.indicator_lights["yellow"]
        } else if (status == DeviceStatus.Connected) {
            status_label_text = "Connected"
            indicator_img = this.indicator_lights["green"]
        } else {
            status_label_text = "N/A"
            indicator_img = this.indicator_lights["grey"]
        }

        const label = $("#device_status_label")
        if (status_label_text != label.text()) {
            label.text(status_label_text)
        }

        const img_elem = $("#device_status .indicator").first()

        if (img_elem.attr("src") != indicator_img) {
            img_elem.attr("src", indicator_img)
        }

        if (this.device_info != null) {
            label.addClass("clickable_label")
        } else {
            label.removeClass("clickable_label")
        }
    }

    /**
     * Sets the Scrutiny Firmware Description content available. Data is provided by the ServerConnection
     * @param loaded_sfd The Scrutiny Firmware Description (SFD) data
     */
    set_loaded_sfd(loaded_sfd: ScrutinyFirmwareDescription | null) {
        this.loaded_sfd = loaded_sfd
        let display_str = "-"

        let project_name = "<Unnamed>"
        let project_version = "<No Version>"

        if (loaded_sfd != null) {
            try {
                project_name = loaded_sfd["metadata"]["project_name"]
            } catch (err) {}

            try {
                project_version = loaded_sfd["metadata"]["version"]
            } catch (err) {}

            try {
                this.loaded_sfd_id = loaded_sfd["firmware_id"]
            } catch (err) {}

            display_str = project_name + " V" + project_version
            $("#loaded_firmware_label").addClass("clickable_label")
        } else {
            $("#loaded_firmware_label").removeClass("clickable_label")
        }

        if (display_str != $("#loaded_firmware_label").text()) {
            $("#loaded_firmware_label").text(display_str)
        }
    }
}
