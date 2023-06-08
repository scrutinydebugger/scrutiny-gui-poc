//    chartjs_custom_plugins.ts
//        Some custom made Chart.js plugins used within the application
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

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

export interface DrawTriggerPluginOptions {
    enabled: boolean
    point_index: number
    color: string
    xaxis_id: string
}

export const DrawTriggerPlugin: Plugin = {
    id: "draw_trigger",
    defaults: {
        enabled: false,
        point_index: 0,
        color: "black",
        xaxis_id: "x",
    },

    afterDatasetsDraw: function (chart: Chart, args: any, options: DrawTriggerPluginOptions) {
        if (options.enabled) {
            const meta = chart.getDatasetMeta(0)
            if (meta.data.length > options.point_index) {
                const context = chart.ctx
                const area = chart.chartArea
                const lineLeftOffset = chart.getDatasetMeta(0).data[options.point_index].x
                // render vertical line
                if (context !== null && lineLeftOffset > area.left && lineLeftOffset < area.right) {
                    context.beginPath()
                    context.setLineDash([5, 5])
                    context.strokeStyle = options.color || "black"
                    context.moveTo(lineLeftOffset, area.top)
                    context.lineTo(lineLeftOffset, area.bottom)
                    context.stroke()
                }
            }
        }
    },
}
