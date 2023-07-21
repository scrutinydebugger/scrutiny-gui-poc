import { MosaicPath } from "react-mosaic-component"
import { defineNewTileManagerRenderer } from "../utils/TileManager"

export interface WidgetMeta {
    name: string
    icon: string | JSX.Element
    translations: {
        [key: string]: Record<string, any>
        en: Record<string, any>
    }
}
