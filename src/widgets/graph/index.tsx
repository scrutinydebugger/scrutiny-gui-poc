import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import { BaseWidget, BaseWidgetProps, useWidgetState } from "../shared/BaseWidget"
import * as translations from "./translations"
import { ToolbarControls } from "./components/ToolbarControls"
import { Config } from "./components/Config"
import { GraphConfig, YAxis } from "./types/GraphConfig"
import { YAxesComponent } from "./components/YAxesComponent"
import { Button } from "@blueprintjs/core"
import { useState } from "react"
import { configToRequest } from "./utils/configToRequest"
import { useScrutinyDatastore } from "../../utils/ScrutinyServer"

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
    const { t } = useTranslation(`widget:${meta.name}`)
    const [config, setConfig] = useWidgetState("config/graph", {
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
    } as GraphConfig)

    const datastore = useScrutinyDatastore()
    const [yaxis] = useWidgetState("config/yaxis", [] as YAxis[])
    const [request, setRequest] = useState("")
    return (
        <>
            <Button>{t("configure")}</Button>
            <Button
                onClick={() => {
                    setRequest(JSON.stringify(configToRequest(config, yaxis, datastore), null, 4))
                }}
            >
                {t("acquire")}
            </Button>
            <hr />
            <Config value={config} onChange={setConfig}></Config>
            <YAxesComponent></YAxesComponent>
            <pre>{request}</pre>
        </>
    )
}
