import {ServerStatus, DeviceStatus} from './global_definitions.js'


export class UI {
    constructor(container) {
        let config = {
            content: []
        };
        this.container = container;
        this.widget_layout = new GoldenLayout(config, container);
        this.widget_layout.on( 'itemDestroyed', function( component ){
            if (component.type === 'component'){
                let widget = component.instance;    // instance is the object returned by the callback in registerComponent
                widget.destroy();
            }
        });

        this.indicator_lights = {
            'red': 'assets/img/indicator-red.png',
            'yellow': 'assets/img/indicator-yellow.png',
            'green': 'assets/img/indicator-green.png',
            'grey': 'assets/img/indicator-grey.png',
        }

        this.loaded_sfd = null
        this.device_info = null
    }

    init() {
        this.widget_layout.init()
        let that = this
        $(window).resize(function() {
            that.resize()
        });
        this.resize();

        $("#modal-close-btn").click(function() {
            $("#modal-container").hide()
        })

        $(document).on('keyup', function(e) {
            if (e.key == "Escape") {
                $("#modal-container").hide()
                $(".tooltip").hide()
            }
        })

        $("#loaded_firmware_label").click(function() {
            that.show_firmware_info()
        })

        $("#device_status_label").click(function() {
            that.show_device_info()
        })

    }



    resize() {
        let golden_layout_margin = 2
        let sidemenu = $('#sidemenu');
        let menubar_height = $('#menubar').outerHeight();
        let statusbar_height = $('#statusbar').outerHeight();
        let sidemenu_width = sidemenu.outerWidth();
        let sidemenu_height = $(window).height() - menubar_height - statusbar_height;

        let golden_layout_width = $(window).width() - sidemenu_width - golden_layout_margin;
        $('#sidemenu').outerHeight(sidemenu_height)
        $('#sidemenu').css('top', menubar_height);
        $("#menubar_corner_filler").outerWidth(sidemenu_width)
        this.container.outerWidth(golden_layout_width - 2 * golden_layout_margin);
        this.container.outerHeight(sidemenu_height - 2 * golden_layout_margin);
        this.container.css('top', menubar_height + golden_layout_margin);
        this.container.css('left', sidemenu_width + golden_layout_margin);
        this.widget_layout.updateSize(this.container.width(), this.container.height());
    }


    show_modal(title, content) {
        $("#modal-content").empty();
        $("#modal-window-title").text(title)
        $("#modal-content").append(content);
        $("#modal-container").show();
        let header_height = $("#modal-window-header").height();
        let img_height = $("#modal-close-btn").outerHeight();
        let button_margin = Math.round((header_height - img_height) / 2);
        $("#modal-close-btn").css('margin-top', '' + button_margin + 'px')
    }

    show_firmware_info() {
        let padLeft = function(s, ch, n) {
            return s.length >= n ? s : (Array(n + 1).join(ch) + s).slice(-n);
        };

        if (this.loaded_sfd != null) {
            let project_name = '-'
            let version = '-'
            let author = '-'
            let firmware_id = '-'
            let generated_on = '-'
            let generated_with = '-'

            try {
                project_name = this.loaded_sfd['metadata']['project_name']
            } catch {}

            try {
                version = this.loaded_sfd['metadata']['version']
            } catch {}

            try {
                author = this.loaded_sfd['metadata']['author']
            } catch {}

            try {
                firmware_id = this.loaded_sfd['firmware_id']
            } catch {}

            try {
                let timestamp = this.loaded_sfd['metadata']['generation_info']['time'];
                let date = new Date(timestamp * 1000); // timestamp in millisec

                let year = String(date.getFullYear());
                let month = padLeft(String((date.getMonth() + 1)), '0', 2);
                let day = padLeft(String(date.getDate()), '0', 2);
                let hours = padLeft(String(date.getHours()), '0', 2);
                let minutes = padLeft(String(date.getMinutes()), '0', 2);
                let seconds = padLeft(String(date.getSeconds()), '0', 2);

                generated_on = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
            } catch {}

            try {
                let python_version = this.loaded_sfd['metadata']['generation_info']['python_version']
                let scrutiny_version = this.loaded_sfd['metadata']['generation_info']['scrutiny_version']
                let system_type = this.loaded_sfd['metadata']['generation_info']['system_type']
                generated_with = `Scrutiny V${scrutiny_version} & Python V${python_version} on ${system_type}`
            } catch {}


            this.show_modal('Firmware details', $("#template-firmware-details-table").html())
            $("#modal-content td[label-name='project-name']").text(project_name)
            $("#modal-content td[label-name='version']").text(version)
            $("#modal-content td[label-name='author']").text(author)
            $("#modal-content td[label-name='firmware_id']").text(firmware_id)
            $("#modal-content td[label-name='generated-on']").text(generated_on)
            $("#modal-content td[label-name='generated-with']").text(generated_with)
        }
    }



    show_device_info() {
        let padLeft = function(s, ch, n) {
            return s.length >= n ? s : (Array(n + 1).join(ch) + s).slice(-n);
        };



        if (this.device_info != null) {
            let device_id = '-';
            let display_name = '-';
            let max_tx_data_size = '-';
            let max_rx_data_size = '-';
            let max_bitrate_bps = '-';
            let rx_timeout_us = '-';
            let heartbeat_timeout_us = '-';
            let address_size_bits = '-';
            let protocol_version = '-';
            let supported_feature_map_content = '-';
            let readonly_memory_regions_content = '-';
            let forbidden_memory_regions_content = '-';

            try {
                device_id = this.device_info['device_id']
            } catch {}

            try {
                display_name = this.device_info['display_name']
            } catch {}

            try {
                max_tx_data_size = this.device_info['max_tx_data_size'] + ' bytes'
            } catch {}

            try {
                max_rx_data_size = this.device_info['max_rx_data_size'] + ' bytes'
            } catch {}

            try {
                max_bitrate_bps = this.device_info['max_bitrate_bps'] + ' b/s'
            } catch {}

            try {
                rx_timeout_us = this.device_info['rx_timeout_us'] + ' us'
            } catch {}

            try {
                heartbeat_timeout_us = this.device_info['heartbeat_timeout_us'] + ' us'
            } catch {}

            try {
                address_size_bits = this.device_info['address_size_bits'] + ' bits'
            } catch {}

            try {
                let major = this.device_info['protocol_major'];
                let minor = this.device_info['protocol_minor']
                protocol_version = `V${major}.${minor}`;
            } catch {}

            try {
                supported_feature_map_content = $('<ul></ul>');
                supported_feature_map_content.append($('<li>Memory read : ' + (this.device_info['supported_feature_map']['memory_read'] ? 'Yes' : 'No') + ' </li>'))
                supported_feature_map_content.append($('<li>Memory Write : ' + (this.device_info['supported_feature_map']['memory_write'] ? 'Yes' : 'No') + ' </li>'))
                supported_feature_map_content.append($('<li>Datalog acquisition: ' + (this.device_info['supported_feature_map']['datalog_acquire'] ? 'Yes' : 'No') + ' </li>'))
                supported_feature_map_content.addClass('list-no-margin')
            } catch {
                supported_feature_map_content = '-'
            }

            try {
                let address_size_bytes = Math.round(this.device_info['address_size_bits'] / 8);
                if (this.device_info['readonly_memory_regions'].length == 0) {
                    readonly_memory_regions_content = 'None'
                } else {
                    readonly_memory_regions_content = $('<ul></ul>');
                    for (let i = 0; i < this.device_info['readonly_memory_regions'].length; i++) {
                        let start = this.device_info['readonly_memory_regions'][i]['start'];
                        let end = this.device_info['readonly_memory_regions'][i]['end'];
                        let display_str = '0x' + padLeft(start.toString(16), '0', address_size_bytes) + ' - 0x' + padLeft(end.toString(16), '0', address_size_bytes)
                        readonly_memory_regions_content.append($('<li>' + display_str + '</li>'))
                    }
                    readonly_memory_regions_content.addClass('list-no-margin')
                }
            } catch {
                readonly_memory_regions_content = '-'
            }


            try {
                let address_size_bytes = Math.round(this.device_info['address_size_bits'] / 8);
                if (this.device_info['forbidden_memory_regions'].length == 0) {
                    forbidden_memory_regions_content = 'None'
                } else {
                    forbidden_memory_regions_content = $('<ul></ul>');
                    for (let i = 0; i < this.device_info['forbidden_memory_regions'].length; i++) {
                        let start = this.device_info['forbidden_memory_regions'][i]['start'];
                        let end = this.device_info['forbidden_memory_regions'][i]['end'];
                        let display_str = '0x' + padLeft(start.toString(16), '0', address_size_bytes) + ' - 0x' + padLeft(end.toString(16), '0', address_size_bytes)
                        forbidden_memory_regions_content.append($('<li>' + display_str + '</li>'))
                    }
                    forbidden_memory_regions_content.addClass('list-no-margin')
                }
            } catch {
                forbidden_memory_regions_content = '-'
            }

            this.show_modal('Device Information', $("#template-device-info-table").html())
            $("#modal-content [label-name='device_id']").text(device_id)
            $("#modal-content [label-name='display_name']").text(display_name)
            $("#modal-content [label-name='max_tx_data_size']").text(max_tx_data_size)
            $("#modal-content [label-name='max_rx_data_size']").text(max_rx_data_size)
            $("#modal-content [label-name='max_bitrate_bps']").text(max_bitrate_bps)
            $("#modal-content [label-name='rx_timeout_us']").text(rx_timeout_us)
            $("#modal-content [label-name='heartbeat_timeout_us']").text(heartbeat_timeout_us)
            $("#modal-content [label-name='address_size_bits']").text(address_size_bits)
            $("#modal-content [label-name='protocol_version']").text(protocol_version)

            $("#modal-content td[label-name='supported_feature_map']").html(supported_feature_map_content)
            $("#modal-content td[label-name='readonly_memory_regions']").html(readonly_memory_regions_content)
            $("#modal-content td[label-name='forbidden_memory_regions']").html(forbidden_memory_regions_content)


            $("#modal-content [show-tooltip]").on('mouseover', function(e) {
                let tooltip = $($(this).attr('show-tooltip'));
                tooltip.show()
            })

            $("#modal-content [show-tooltip]").on('mouseleave', function(e) {
                let tooltip = $($(this).attr('show-tooltip'));
                tooltip.hide()
            })

        }
    }

    register_widget(widget_class, app) {
        // Add component to GoldenLayout
        this.widget_layout.registerComponent(widget_class.name(),
            function(container, state) {
                let widget = new widget_class(container.getElement(), app)
                widget.initialize();
                return widget
            });

        // Add menu item for drag and drop
        let div = $('<div></div>');
        div.addClass('widget_draggable_item')

        let img = $('<img/>');
        img.attr('src', widget_class.icon_path());
        img.attr('width', '64px');
        img.attr('height', '48px');

        let label = $('<span></span>')
        label.addClass('widget_draggable_label')
        label.text(widget_class.display_name())

        div.append(img);
        div.append(label);

        $('#sidemenu').append(div);
        $('#sidemenu').append($('<div class="horizontal_separator"></div>'));

        let newItemConfig = {
            title: widget_class.display_name(),
            type: 'component',
            componentName: widget_class.name(),
            componentState: {}
        };

        this.widget_layout.createDragSource(div, newItemConfig);
    }


    set_server_status(status) {
        if (status == ServerStatus.Disconnected) {
            $('#server_status_label').text('Disconnected');
            $('#server_status .indicator').attr('src', this.indicator_lights['red'])
        } else if (status == ServerStatus.Connecting) {
            $('#server_status_label').text('Connecting');
            $('#server_status .indicator').attr('src', this.indicator_lights['yellow'])
        } else if (status == ServerStatus.Connected) {
            $('#server_status_label').text('Connected');
            $('#server_status .indicator').attr('src', this.indicator_lights['green'])
        } else {
            $('#server_status_label').text('Unknown');
            $('#server_status .indicator').attr('src', this.indicator_lights['grey'])
        }
    }


    set_device_status(status, device_info) {
        this.device_info = device_info;

        let status_label_text = "";
        let indicator_img = "";
        if (status == DeviceStatus.Disconnected) {
            status_label_text = "Disconnected";
            indicator_img = this.indicator_lights['red'];
        } else if (status == DeviceStatus.Connecting) {
            status_label_text = "Connecting";
            indicator_img = this.indicator_lights['yellow'];
        } else if (status == DeviceStatus.Connected) {
            status_label_text = "Connected";
            indicator_img = this.indicator_lights['green'];
        } else {
            status_label_text = "N/A";
            indicator_img = this.indicator_lights['grey'];
        }

        if (status_label_text != $('#device_status_label').text()) {
            $('#device_status_label').text(status_label_text);
        }

        let img_elem = $('#device_status .indicator').first();

        if (img_elem.attr('src') != indicator_img) {
            img_elem.attr('src', indicator_img)
        }

        if (this.device_info != null) {
            $("#device_status_label").addClass('clickable_label');
        } else {
            $("#device_status_label").removeClass('clickable_label');
        }
    }

    set_loaded_sfd(loaded_sfd) {
        this.loaded_sfd = loaded_sfd
        let display_str = '-'

        let project_name = '<Unnamed>'
        let project_version = '<No Version>'

        if (loaded_sfd != null) {

            try {
                project_name = loaded_sfd['metadata']['project_name']
            } catch {}

            try {
                project_version = loaded_sfd['metadata']['version']
            } catch {}

            try {
                this.loaded_sfd_id = loaded_sfd['firmware_id']
            } catch {}

            display_str = project_name + ' V' + project_version;
            $("#loaded_firmware_label").addClass('clickable_label');
        } else {
            $("#loaded_firmware_label").removeClass('clickable_label');
        }

        if (display_str != $('#loaded_firmware_label').text()) {
            $('#loaded_firmware_label').text(display_str);
        }
    }
}