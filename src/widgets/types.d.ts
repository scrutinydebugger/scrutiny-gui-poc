import { MosaicPath } from "react-mosaic-component";
export interface WidgetMeta {
  widget_name: string;
  icon_path: string;
  translations: {
    [key: string]: Record<string, any>;
    en: Record<string, any>;
  };
}
