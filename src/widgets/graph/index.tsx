import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import { BaseWidget, BaseWidgetProps, useWidgetState } from "../shared/BaseWidget"
import * as translations from "./translations"
import { ToolbarControls } from "./components/ToolbarControls"
import { Config } from "./components/Config"
import { GraphConfig } from "./types/GraphConfig"

export const meta: WidgetMeta = {
    name: "graph",
    icon: "assets/img/graph-96x128.png",
    translations,
}

export function Widget(props: BaseWidgetProps) {
    const { tileId, ...rest } = props
    const { t } = useTranslation(`widget:${meta.name}`)

    return (
        <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`} toolbarControls={<ToolbarControls></ToolbarControls>}>
            <WidgetContent></WidgetContent>
        </BaseWidget>
    )
}

function WidgetContent() {
    const [config, setConfig] = useWidgetState("config", {
        config_name: "Graph",
        sampling_rate: null,
        decimation: 1,
        effective_sampling_rate: "",
        probe_location: 50,
        timeout: "",
        xaxis_type: "measured_time",
        xaxis_signal: null,
        trigger_type: "true",
        operand1: "",
        operand2: "",
        operand3: "",
        trigger_hold_time: 0,
        yaxis: [],
    } as GraphConfig)
    return (
        <>
            <Config value={config} onChange={setConfig}></Config>
        </>
    )
}
