import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import { BaseWidget, BaseWidgetProps } from "../shared/BaseWidget"
import * as translations from "./translations"
import { ToolbarControls } from "./components/ToolbarControls"
import { Graph } from "./components/Graph"
import { Config } from "./components/Config"

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
    return (
        <>
            <Config></Config>
        </>
    )
}
