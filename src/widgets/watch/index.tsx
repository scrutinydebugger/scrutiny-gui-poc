import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import * as translations from "./translations"
import { BaseWidget, BaseWidgetProps } from "../shared/BaseWidget"
import { ToolbarControls } from "./components/ToolbarControls"

// Widget specific import
import "./watch.css"
import "./watch-treetable-theme.css"
import { Watch } from "./components/Watch"

export const meta: WidgetMeta = {
    name: "watch",
    icon: "assets/img/eye-96x128.png",
    translations,
}

export function Widget(props: BaseWidgetProps) {
    const { tileId, ...rest } = props
    const { t } = useTranslation(`widget:${meta.name}`)

    return (
        <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`} toolbarControls={<ToolbarControls></ToolbarControls>}>
            <Watch></Watch>
        </BaseWidget>
    )
}
