import { defineNewTileManagerRenderer } from "../../utils/TileManager";
import { WidgetMeta } from "../types";
import * as translations from "./translations";
import { Watch } from "./Watch";

export const meta: WidgetMeta = {
  widget_name: "watch",
  icon_path: "assets/img/eye-96x128.png",
  translations,
};

export const renderer = defineNewTileManagerRenderer(
  (props) => <Watch {...props}></Watch>,
  () => ({})
);
