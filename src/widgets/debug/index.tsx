import { WidgetMeta } from "../types";
import { defineNewTileManagerRenderer } from "../../utils/TileManager/TileRenderer";
import * as translations from "./translations";
import { Debug } from "./Debug";

export const meta: WidgetMeta = {
  widget_name: "debug",
  icon_path: "logo192.png",
  translations,
};

export const renderer = defineNewTileManagerRenderer(
  (props) => {
    return <Debug {...props}></Debug>;
  },
  () => ({})
);
