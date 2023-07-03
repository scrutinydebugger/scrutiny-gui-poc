import * as widgets from "./index";
import { TileTypes, TileTypesProvider } from "../utils/TileManager";

export const tileTypes: TileTypesProvider = () =>
  Object.values(widgets).reduce((tileTypes, widget) => {
    const widgetType = widget.meta.widget_name;
    tileTypes[widgetType] = widget.renderer;
    return tileTypes;
  }, {} as TileTypes);
