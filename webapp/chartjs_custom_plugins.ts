//    chartjs_custom_plugins.ts
//        Some custom made Chart.js plugins used within the application
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

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
