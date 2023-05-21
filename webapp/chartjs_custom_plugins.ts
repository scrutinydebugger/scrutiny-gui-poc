import { check_exist_nested } from "@src/tools"
import { Chart, Plugin, LegendItem } from "chart.js/auto"

export interface RemoveUnusedAxesPluginOptions {
    enabled: boolean
}

type DataLegendClickCallback = (e: JQuery.ClickEvent, item: LegendItem | null, chart: Chart) => void
export interface DataLegendPluginOptions {
    enabled: boolean
    container_id: string
    onClick: DataLegendClickCallback | null
    selected_datasets: Set<number> | null
}

export const RemoveUnusedAxesPlugin: Plugin = {
    id: "remove_unused_axes",
    defaults: { enabled: true },
    beforeLayout: function (chart: Chart, _args: any, options: RemoveUnusedAxesPluginOptions) {
        if (!options.enabled) {
            return
        }

        let axis_display_map: Record<string, boolean> = {}
        for (let i = 0; i < chart.data.datasets.length; i++) {
            const meta = chart.getDatasetMeta(i)
            if (typeof meta === "undefined") {
                return false
            }
            const y_axis_id = meta.yAxisID
            if (typeof y_axis_id === "undefined") {
                return false
            }

            if (!axis_display_map.hasOwnProperty(y_axis_id)) {
                axis_display_map[y_axis_id] = false
            }

            if (meta.visible) {
                axis_display_map[y_axis_id] = true
            }
        }

        for (let axis_id in axis_display_map) {
            if (axis_display_map.hasOwnProperty(axis_id)) {
                if (!chart.scales.hasOwnProperty(axis_id)) {
                    throw "Axis does not exist " + axis_id
                }
                chart.scales[axis_id].options.display = axis_display_map[axis_id]
            }
        }
    },
}

function make_legend_row(
    options: DataLegendPluginOptions,
    item: LegendItem | null,
    text: string,
    chart: Chart,
    is_xaxis: boolean = false
): JQuery<HTMLTableRowElement> {
    let dataset_index: number | null = null
    if (item !== null) {
        dataset_index = item.datasetIndex ?? null
    }
    const colorbox_td = $("<td></td>")
    const text_td = $("<td></td>")
    const val_td = $("<td></td>")
    const tr = $("<tr></tr>") as JQuery<HTMLTableRowElement>
    tr.append(colorbox_td).append(text_td).append(val_td)
    tr.on("click", function (e) {
        if (options.onClick !== null) {
            options.onClick(e, item, chart)
        }
    })

    if (dataset_index !== null) {
        tr.attr("dataset-index", dataset_index)
        if (options.selected_datasets !== null) {
            if (options.selected_datasets.has(dataset_index)) {
                tr.addClass("selected")
            }
        }
    }
    if (is_xaxis) {
        tr.addClass("xaxis")
    }

    // Color box
    if (item !== null && dataset_index !== null) {
        const colorbox = $("<span class='legend_color_box'></span>")
        if (typeof item.fillStyle == "string") {
            colorbox.css("background", item.fillStyle)
        }
        if (typeof item.strokeStyle == "string") {
            colorbox.css("border-color", item.strokeStyle)
        }
        colorbox.on("click", function (e) {
            if (dataset_index !== null) {
                chart.setDatasetVisibility(dataset_index, !chart.isDatasetVisible(dataset_index))
                chart.update()
                e.stopPropagation()
            }
        })
        colorbox_td.append(colorbox)
    }

    // Text
    const ptext = $("<p class='legend_text'></p>")
    if (item !== null && item.hidden) {
        ptext.addClass("line_hidden")
    }
    ptext.text(text + ":")
    text_td.append(ptext)

    // value
    const pval = $("<p class='legend_val'></p>")
    val_td.append(pval)
    tr.append(val_td)
    return tr
}

export const DataLegendPlugin: Plugin = {
    id: "data_legend",
    defaults: {
        enabled: true,
        container_id: "",
        onClick: null,
        selected_datasets: null,
    },
    afterUpdate(chart: Chart, args: any, options: DataLegendPluginOptions) {
        if (!options.enabled) {
            return
        }
        const container = $("#" + options.container_id)
        if (container.length == 0) {
            throw "Cannot find legend container with ID " + options.container_id
        }
        container.html("")
        const legend_table = $("<table class='legend'><thead></thead></table>")
        const tbody = $("<tbody></tbody>")
        container.append(legend_table)
        legend_table.append(tbody)

        legend_table.append(make_legend_row(options, null, "x-axis", chart, true))
        // @ts-ignore
        const items = chart.options.plugins.legend.labels.generateLabels(chart)
        for (let i = 0; i < items.length; i++) {
            legend_table.append(make_legend_row(options, items[i], items[i].text, chart, false))
        }
    },
}
