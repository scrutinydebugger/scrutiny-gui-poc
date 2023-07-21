import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import { BaseWidget, BaseWidgetProps } from "../shared/BaseWidget"
import * as translations from "./translations"
import { ToolbarControls } from "./components/ToolbarControls"

// Widget specific import
import "./styles/varlist.css"
import "./styles/treetable-theme.css"
import { Varlist } from "./components/Varlist"

export const meta: WidgetMeta = {
    name: "varlist",
    icon: "assets/img/treelist-96x128.png",
    translations,
}

export function Widget(props: BaseWidgetProps) {
    const { tileId, ...rest } = props
    const { t } = useTranslation(`widget:${meta.name}`)
    return (
        <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`} toolbarControls={<ToolbarControls></ToolbarControls>}>
            <Varlist></Varlist>
        </BaseWidget>
    )
}
