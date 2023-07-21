import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import { BaseWidget, BaseWidgetProps } from "../shared/BaseWidget"
import { useTileManager } from "../../utils/TileManager"

export const meta: WidgetMeta = {
    name: "debug",
    icon: "logo192.png",
    translations: {
        en: {
            display_name: "Debug",
        },
    },
}

export function Widget(props: BaseWidgetProps) {
    const { mosaic, _tileData } = useTileManager()
    const { tileId, ...rest } = props
    const { t } = useTranslation(`widget:${meta.name}`)
    return (
        <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`}>
            <pre>
                Debug Information {"\n"}
                Mosaic:{JSON.stringify(mosaic, null, 4)}
                {"\n"}
                Tile Data:{JSON.stringify(_tileData, null, 4)}
            </pre>
        </BaseWidget>
    )
}
