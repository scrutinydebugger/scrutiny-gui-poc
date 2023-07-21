import widgets from "./index"
import { TileTypes, TileTypesProvider, defineNewTileManagerRenderer } from "../utils/TileManager"

const _tileTypes = widgets.reduce((tileTypes, widget) => {
    const widgetType = widget.meta.name
    tileTypes[widgetType] = defineNewTileManagerRenderer(
        (props) => <widget.Widget {...props}></widget.Widget>,
        () => ({})
    )
    return tileTypes
}, {} as TileTypes)

export const tileTypes: TileTypesProvider = () => _tileTypes
