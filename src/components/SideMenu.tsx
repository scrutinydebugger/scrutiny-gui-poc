import React, { useMemo } from "react";
import "./styles/side_menu.css";

import * as widgets from "../widgets";
import { useDrag } from "react-dnd";
import { MosaicDragType } from "react-mosaic-component";
import { WidgetMeta } from "../widgets/types";
import { useTileManager } from "../utils/TileManager/useTileManager";
import { ActionAddNewTile } from "../utils/TileManager";
import { MosaicDropData } from "react-mosaic-component/lib/internalTypes";
import { useTranslation } from "react-i18next";

function HorizontalSeparator() {
  return <div className="horizontal_separator"></div>;
}

function SideMenuEntry(props: { widgetKey: string; meta: WidgetMeta }) {
  const { dispatch } = useTileManager();
  const { t } = useTranslation("widget:" + props.widgetKey);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, drag] = useDrag(
    () => ({
      type: MosaicDragType.WINDOW,
      item: () => {
        const item = { ...props.meta, mosaicId: "tileManager" };
        return item;
      },

      end(item, monitor) {
        const dropResult = monitor.getDropResult() as MosaicDropData | null;
        // widget added
        const action: ActionAddNewTile = {
          action: "addNewTile",
          tileType: props.meta.widget_name,
          position: dropResult?.position ?? "left",
          path: dropResult?.path ?? ["first"],
        };
        dispatch(action);
      },
    }),
    [props.meta]
  );
  return (
    <>
      <div className="widget_draggable_item" ref={drag}>
        <img
          src={props.meta.icon_path}
          width="64px"
          height="48px"
          alt={t("display_name") ?? "icon"}
        ></img>
        <span className="widget_draggable_label">{t("display_name")}</span>
      </div>
    </>
  );
}

export default function SideMenu(props: {}): React.JSX.Element {
  const entries = useMemo(
    () =>
      (Object.keys(widgets) as Array<keyof typeof widgets>).map((widgetKey) => {
        const widget = widgets[widgetKey];
        return (
          <div key={widgetKey}>
            <SideMenuEntry
              widgetKey={widgetKey}
              meta={widget.meta}
            ></SideMenuEntry>
            <HorizontalSeparator></HorizontalSeparator>
          </div>
        );
      }),
    []
  );
  const { clearAll } = useTileManager();

  return (
    <div className="side_menu">
      <div>
        <button onClick={clearAll}>Clear All</button>
      </div>
      <HorizontalSeparator></HorizontalSeparator>
      {entries}
    </div>
  );
}
