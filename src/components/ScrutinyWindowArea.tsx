import React from "react";
import { Mosaic } from "react-mosaic-component";
import { useTileManager } from "../utils/TileManager/useTileManager";
import { useDragDropManager } from "react-dnd";
import { BlankTile } from "./BlankTile";

import "react-mosaic-component/react-mosaic-component.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

export function ScrutinyWindowArea(): React.JSX.Element {
  const { renderTile, dispatch, mosaic } = useTileManager();

  return (
    <div className="scrutinyWindowArea">
      <Mosaic<string>
        value={mosaic}
        onChange={(d) => {
          dispatch({
            action: "setMosaic",
            value: d,
          });
        }}
        renderTile={renderTile}
        zeroStateView={<BlankTile></BlankTile>}
        mosaicId="tileManager"
        dragAndDropManager={useDragDropManager()}
        blueprintNamespace="bp5"
      ></Mosaic>
    </div>
  );
}
