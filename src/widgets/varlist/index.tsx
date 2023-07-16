import { WidgetMeta } from "../types"
import "./styles/varlist.css"
import "./styles/treetable-theme.css"
import { defineNewTileManagerRenderer } from "../../utils/TileManager/TileRenderer"
import * as translations from "./translations"
import { Varlist } from "./components/Varlist"

export const meta: WidgetMeta = {
    widget_name: "varlist",
    icon_path: "assets/img/treelist-96x128.png",
    translations,
}

export const renderer = defineNewTileManagerRenderer(
    (props) => {
        return <Varlist {...props}></Varlist>
    },
    () => ({})
)
